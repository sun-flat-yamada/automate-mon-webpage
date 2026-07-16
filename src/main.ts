/**
 * @file main.ts
 * @description
 * 指定されたURLにPuppeteerでアクセスし、スクリーンショットの撮影と製品情報の抽出を行う。
 * エントリポイントとしての責務を持つ。
 */

import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import fs from "fs";
import path from "path";
import { getExtractor } from "./extractor.js";
import * as iconv from "iconv-lite";

/**
 * HTMLファイルを適切なエンコーディング（Shift_JIS等）で読み込むユーティリティ。
 * ローカルの過去HTMLデータがShift_JISである場合に対応。
 */
function readHtmlWithEncoding(filePath: string): string {
  const buffer = fs.readFileSync(filePath);

  const isHistoryFile = filePath.replace(/\\/g, "/").includes("/history/");
  let html: string;

  if (isHistoryFile) {
    console.log(`  🔍 Detected history file: defaulting to UTF-8`);
    html = buffer.toString("utf-8");
  } else {
    // Heuristic 1: Charset meta tag
    const snippet = buffer.toString("ascii", 0, 10000);
    const charsetMatch = snippet.match(/charset=["']?([a-zA-Z0-9_-]+)/i);

    const isDellHistory = filePath.includes("dell_outlets");

    if (charsetMatch && charsetMatch[1]) {
      const charset = charsetMatch[1].toLowerCase();
      console.log(`  🔍 Detected charset from meta tag: ${charset}`);
      if (charset.includes("shift") || charset.includes("sjis")) {
        html = iconv.decode(buffer, "Shift_JIS");
      } else {
        html = buffer.toString("utf-8");
      }
    } else if (
      buffer.includes(Buffer.from([0x89, 0xbf, 0x8a, 0x69])) || // "価格" in SJIS
      buffer.includes(Buffer.from([0xb1, 0xb3, 0xc4, 0xda])) || // "ｱｳﾄﾚ" (half-width) in SJIS
      isDellHistory
    ) {
      console.log(`  🔍 Detected Shift_JIS by heuristic (bytes or path: ${isDellHistory})`);
      html = iconv.decode(buffer, "Shift_JIS");
    } else {
      console.log("  🔍 No specific encoding detected, defaulting to UTF-8");
      html = buffer.toString("utf-8");
    }
  }

  console.log(`  🔍 Decoded HTML length: ${html.length}`);
  const kKakaku = "\u4fa1\u683c"; // 価格
  const hasKkakaku = html.includes(kKakaku);
  console.log(`  🔍 Decoded HTML contains '${kKakaku}': ${hasKkakaku}`);
  if (!hasKkakaku) {
     console.log(`  🔍 Sample near expected '${kKakaku}' (12040): ${html.substring(12030, 12050)}`);
  }

  // ブラウザが元のエンコーディングで再デコードしないよう、メタタグを完全に除去し、UTF-8を明示的に挿入する
  // 過去の複雑なメタタグにも対応するため、一括で置換
  html = html.replace(/<meta[^>]*>/gi, "");

  const utf8Meta = '<meta charset="utf-8">';
  if (html.toLowerCase().includes("<head>")) {
    html = html.replace(/<head>/i, '<head>' + utf8Meta);
  } else {
    html = utf8Meta + html;
  }

  return html;
}

(async () => {
  const targetUrl = process.env["TARGET_URL"];
  const targetSelector = process.env["TARGET_SELECTOR"];
  const extractorType = process.env["EXTRACTOR_TYPE"];
  const outputDir = process.env["OUTPUT_DIR"] || ".";

  if (outputDir !== "." && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const out = (file: string) => path.join(outputDir, file);

  if (!targetUrl) {
    console.error("Error: TARGET_URL environment variable is not set.");
    process.exit(1);
  }

  console.log(`Target URL: ${targetUrl}`);
  console.log(`Target Selector: ${targetSelector || "None (Full Page)"}`);
  console.log(`Extractor Type: ${extractorType || "None"}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Navigating to page...");
    if (targetUrl.startsWith("file://")) {
      const filePath = targetUrl.replace("file://", "").replace(/^\/([a-zA-Z]:)/, "$1"); // Handle Windows paths
    console.log(`Loading local file with atomic byte-transfer: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    const bytes = Array.from(buffer);

    await page.goto("about:blank", { waitUntil: "networkidle2" });
    await page.evaluate((bytes) => {
      // 1. バイト配列から charset を簡易的に検出
      const snippet = String.fromCharCode(...bytes.slice(0, 5000));
      const match = snippet.match(/charset=["']?([a-zA-Z0-9_-]+)/i);
      let charset = match && match[1] ? match[1].toLowerCase() : "shift-jis";

      // 互換性のため正規化
      if (charset.includes("shift") || charset.includes("sjis") || charset === "cp932") {
        charset = "shift-jis";
      } else if (charset.includes("utf-8") || charset.includes("utf8")) {
        charset = "utf-8";
      }

      console.log(`Browser-side decoding with charset: ${charset}`);
      const decoder = new TextDecoder(charset);
      const html = decoder.decode(new Uint8Array(bytes));

      document.open();
      document.write(html);
      document.close();
    }, bytes);
    await page.waitForNetworkIdle();
    } else {
      await page.goto(targetUrl, { waitUntil: "networkidle2" });
    }

    console.log("Scrolling page to trigger lazy loading...");
    await autoScroll(page);

    // スクリーンショット撮影
    if (targetSelector) {
      const element = await page.$(targetSelector);
      if (element) {
        console.log(`Capturing selector: ${targetSelector}`);
        await element.screenshot({ path: out("section.png") });
      } else {
        console.warn(`Selector not found: ${targetSelector}. Capturing full page instead.`);
        await page.screenshot({ path: out("section.png"), fullPage: true });
      }
    } else {
      console.log("Capturing full page...");
      await page.screenshot({ path: out("section.png"), fullPage: true });
    }

    // 製品抽出
    const extractor = getExtractor(extractorType);
    if (extractor) {
      console.log(`Using extractor: ${extractor.name}`);
      // performExtractionInBrowser 内部で evaluate を実行
      const productsResult = await performExtractionInBrowser(page, extractorType);
      fs.writeFileSync(out("data.json"), JSON.stringify(productsResult, null, 2));
      console.log(`Extracted ${productsResult.length} products to ${out("data.json")}`);
    } else {
      console.log("No extractor specified or found for this target. Skipping data extraction.");
      fs.writeFileSync(out("data.json"), JSON.stringify([], null, 2));
    }

    // HTMLソースの保存
    const html = await page.content();
    fs.writeFileSync(out("section.html"), html);
  } catch (error) {
    console.error("Critical error during process:", error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

async function performExtractionInBrowser(page: Page, type: string | undefined) {
  return await page.evaluate((extractorType) => {
    console.log(`  🔍 Starting browser-side extraction: target type = ${extractorType}`);

    const getCleanText = (el: Element | null | undefined): string => {
      if (!el) return "";
      const clone = el.cloneNode(true) as Element;
      const toRemove = clone.querySelectorAll("script, style, select, link, button, input");
      toRemove.forEach((node) => node.remove());
      clone.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
      return clone.textContent?.trim().replace(/\s+/g, " ") || "";
    };

    if (extractorType?.toLowerCase() === "dell-outlet") {
      const tables = Array.from(document.querySelectorAll("table"));
      console.log(`  🔍 [dell-outlet] Found ${tables.length} tables. Checking for product headers...`);
      const productList: any[] = [];

      tables.forEach((table, tableIdx) => {
            const rows = Array.from(table.querySelectorAll("tr"));
            if (rows.length < 2) return;

            console.log(`  🔍 [Table ${tableIdx}] innerText Sample: ${table.innerText.substring(0, 100).replace(/\s+/g, " ")}`);

            let headers: string[] = [];
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const row = rows[r];
          if (!row) continue;
          const cells = Array.from(row.querySelectorAll("td, th"));
          const rowTexts = cells.map((c) => getCleanText(c));

          const hasPrice = rowTexts.some(
            (t) =>
              t.toLowerCase().includes("\u4fa1\u683c") || // 価格
              t.toLowerCase().includes("\u00ec\uff98") || // 価格 (mojibake)
              t.toLowerCase().includes("price") ||
              t.toLowerCase().includes("\\") ||
              t.toLowerCase().includes("\u00a5") ||
              t.toLowerCase().includes("no."),
          );
          const hasSpec = rowTexts.some(
            (t) =>
              t.toLowerCase().includes("\u4ed5\u69d8") || // 仕様
              t.toLowerCase().includes("spec") ||
              t.toLowerCase().includes("\u30a2\u30a6\u30c8\u30ec\u30c3\u30c8") || // アウトレット
              t.toLowerCase().includes("\uff71\uff73\uff84\uff9a\uff6f\uff84") || // ｱｳﾄﾚｯﾄ
              t.toLowerCase().includes("\u00ef\uff82\uffbd") || // ｱｳﾄﾚｯﾄ (mojibake part)
              t.toLowerCase().includes("model"),
          );

          // Requires BOTH to avoid false positives (Return policy tables etc.)
          if (hasPrice && hasSpec) {
            console.log(`  ✅ [Table ${tableIdx}] Product header found at row ${r}`);
            console.log(`     Headers: [${rowTexts.join(" | ")}]`);
            // Debug: Log first 10 hex char codes of the first cell
            if (rowTexts[0]) {
              const hexCodes = rowTexts[0].split("").slice(0, 10).map(c => c.charCodeAt(0).toString(16)).join(" ");
              console.log(`     Debug Hex: ${hexCodes}`);
            }
            headers = rowTexts;
            headerRowIdx = r;
            break;
          }
        }

        if (headerRowIdx === -1) return;

        const findIdx = (terms: string[]) =>
          headers.findIndex((h) =>
            terms.some((term) => h.toLowerCase().includes(term.toLowerCase())),
          );

        let priceIdx = findIdx(["\u4fa1\u683c", "\u00ec\uff98", "price", "priceall", "\\", "\u00a5"]); // 価格, \, ¥
        let specIdx = findIdx(["\u4ed5\u69d8", "specifications", "spec", "\u54c1\u540d", "\uff71\uff73\uff84\uff9a\uff6f\uff84\u54c1\u540d"]); // 仕様, 品名, ｱｳﾄﾚｯﾄ品名, Noを削除
        let osIdx = findIdx(["os", "office", "\u30bd\u30d5\u30c8\u30a6\u30a7\u30a2", "\uff7b\uff8b\uff84\uff73\uffa4\uff67"]); // os, office, ソフトウェア, ｿﾌﾄｳｪｱ
        let memoryIdx = findIdx(["\u30e1\u30e2\u30ea", "\uff92\uff93\uff98", "memory", "ram"]); // メモリ, ﾒﾓﾘ, memory, ram
        let hddIdx = findIdx(["hdd", "\u30b9\u30c8\u30ec\u30fc\u30b8"]); // hdd, ストレージ
        let opticalIdx = findIdx(["\u5149\u5b66", "optical", "\uff7a\uff73\uff76\uff78"]); // 光学, optical, ｺｳｶﾞｸ
        let videoIdx = findIdx(["\u30d3\u30c7\u30aa", "video", "graphics", "\uff8b\uff9e\uff83\uff75", "controller", "\u30b3\u30f3\u30c8\u30ed\u30fc\u30e9", "\uff7a\uff9d\uff84\uff9b\uff70\uff97"]); // ビデオ, video, ﾋﾞﾃﾞｵ, controller, コントローラ, ｺﾝﾄﾛｰﾗ
        let soundIdx = findIdx(["\u30b5\u30a6\u30f3\u30c9", "sound", "audio", "\uff7b\uff73\uff9d\uff84\uff9e"]); // サウンド, sound, ｻｳﾝﾄﾞ
        let othersIdx = findIdx(["\u305d\u306e\u4ed6", "other", "\uff7f\uff89\uff80"]); // その他, ｿﾉﾀ

        // Fallback: Use data patterns if headers failed
        if (rows.length > headerRowIdx + 1 && rows[headerRowIdx + 1]) {
            const firstDataRow = Array.from(rows[headerRowIdx + 1]!.querySelectorAll("td")).map(c => getCleanText(c));

            if (priceIdx === -1) {
                // Find column with currency symbol
                priceIdx = firstDataRow.findIndex(t => t.includes("\\") || t.includes("\u00a5"));
                if (priceIdx !== -1) console.log(`  💡 Inferred Price column from data at index ${priceIdx}: ${firstDataRow[priceIdx]}`);
            }

            if (specIdx === -1 || specIdx === 0) { // 0 is often No., so suspect if it's 0
                // Find column with longest text
                let maxLen = 0;
                let maxIdx = -1;
                firstDataRow.forEach((t, i) => {
                    if (t.length > maxLen && i !== priceIdx) {
                        maxLen = t.length;
                        maxIdx = i;
                    }
                });
                if (maxIdx !== -1 && maxLen > 20) {
                     specIdx = maxIdx;
                     console.log(`  💡 Inferred Spec column from data at index ${specIdx} (len ${maxLen})`);
                }
            }
        }

        console.log(`     Indices -> price: ${priceIdx}, spec: ${specIdx}, os: ${osIdx}, mem: ${memoryIdx}, hdd: ${hddIdx}`);

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          const cells = Array.from(row.querySelectorAll("td"));
          if (cells.length < 2) continue; // Minimal cells required (Price + Spec)

          const currentDataRowTexts = cells.map((c) => getCleanText(c));

          // もし片方しか見つからない場合（列が結合されている場合など）、もう片方も同じインデックスにする
          if (priceIdx === -1 && specIdx !== -1) {
            const specText = currentDataRowTexts[specIdx];
            // specIdxのセルに価格らしきもの（¥や\）が含まれていれば、それを価格列としても扱う
            if (specText && (specText.includes("\\") || specText.includes("¥") || specText.includes("\u00a5"))) {
              priceIdx = specIdx;
            }
          } else if (specIdx === -1 && priceIdx !== -1) {
            const priceText = currentDataRowTexts[priceIdx];
            // priceIdxのセルに仕様らしきもの（長い文字列）が含まれていれば、それを仕様列としても扱う
            if (priceText && priceText.length > 50) {
              specIdx = priceIdx;
            }
          }


          const product: any = { // Changed to 'any' as 'Product' type is not defined in this scope
            price: priceIdx !== -1 ? getCleanText(cells[priceIdx]) : "",
            specifications: specIdx !== -1 ? getCleanText(cells[specIdx]) : "",
            os_office: osIdx !== -1 ? getCleanText(cells[osIdx]) : "",
            memory: memoryIdx !== -1 ? getCleanText(cells[memoryIdx]) : "",
            hdd: hddIdx !== -1 ? getCleanText(cells[hddIdx]) : "",
            video_controller: videoIdx !== -1 ? getCleanText(cells[videoIdx]) : "",
            others: othersIdx !== -1 ? getCleanText(cells[othersIdx]) : "",
          };

          // Refined product validation logic (synced with extractor.ts)
          const isProduct =
            (product.price.includes("\\") ||
              product.price.includes("¥") ||
              product.price.includes("\u00a5") ||
              product.price.includes("円") ||
              /[0-9]{1,3}(,[0-9]{3})+/.test(product.price)) &&
            product.specifications.length > 5 &&
            !product.specifications.toLowerCase().includes("submitget") &&
            !product.specifications.toLowerCase().includes("frmprodhead");

          if (isProduct) {
            productList.push(product);
          } else if (i < headerRowIdx + 5) {
            // 最初の方の数行だけ、なぜ不合格かログを出す（デバック用）
            console.log(`    ❌ Row ${i} rejected: price='${product.price.substring(0, 20)}', specLen=${product.specifications.length}`);
          }
        }
      });

      console.log(`  📊 [dell-outlet] Extraction finished. Total products found: ${productList.length}`);
      return productList;
    }
    return [];
  }, type);
}

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
  await new Promise((r) => setTimeout(r, 1000));
}
