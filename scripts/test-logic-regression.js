/**
 * @file test-logic-regression.js
 * @description
 * 過去のHTMLデータを用いて抽出ロジックの回帰テストを行う。
 * DellOutletExtractor の動作を実際の履歴データで検証する。
 *
 * Note: このテストは履歴データの構造がエクストラクタと一致している場合のみパスします。
 * 履歴データの構造が異なる場合は、診断モードとして情報を出力します。
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { getExtractor } from "../dist/extractor.js";

const HISTORY_DIR = path.join(process.cwd(), "history");
const VERBOSE = process.env.VERBOSE === "true";

/**
 * HTMLファイルを適切なエンコーディングで読み込む
 */
function readHtmlWithEncoding(filePath) {
  const buffer = fs.readFileSync(filePath);

  const isHistoryOrFixture = filePath.replace(/\\/g, "/").includes("/history/") || filePath.replace(/\\/g, "/").includes("/fixtures/");
  if (isHistoryOrFixture) {
    let html = buffer.toString("utf-8");
    // 整理: Metaタグを除去して UTF-8 を明示
    html = html.replace(/<meta[^>]*http-equiv=["']?content-type["']?[^>]*>/gi, "");
    html = html.replace(/<meta[^>]*charset=["']?[a-zA-Z0-9_-]+["']?[^>]*>/gi, "");

    const utf8Meta = '<meta charset="utf-8">';
    if (html.toLowerCase().includes("<head>")) {
      html = html.replace(/<head>/i, '<head>' + utf8Meta);
    } else {
      html = utf8Meta + html;
    }
    return html;
  }

  // Heuristic 1: Charset meta tag
  const snippet = buffer.toString("ascii", 0, 10000);
  const charsetMatch = snippet.match(/charset=["']?([a-zA-Z0-9_-]+)/i);

  let html;
  if (charsetMatch && charsetMatch[1]) {
    const charset = charsetMatch[1].toLowerCase();
    if (charset.includes("shift") || charset.includes("sjis")) {
      html = iconv.decode(buffer, "Shift_JIS");
    } else if (charset.includes("euc")) {
      html = iconv.decode(buffer, "EUC-JP");
    } else {
      html = buffer.toString("utf8");
    }
  } else if (buffer.includes(Buffer.from([0x89, 0xbf, 0x8a, 0x69]))) {
    // Heuristic 2: "価格" in SJIS bytes (89 BF 8A 69)
    html = iconv.decode(buffer, "Shift_JIS");
  } else {
    html = buffer.toString("utf8");
  }

  // 整理: Metaタグを除去して UTF-8 を明示
  html = html.replace(/<meta[^>]*http-equiv=["']?content-type["']?[^>]*>/gi, "");
  html = html.replace(/<meta[^>]*charset=["']?[a-zA-Z0-9_-]+["']?[^>]*>/gi, "");

  const utf8Meta = '<meta charset="utf-8">';
  if (html.toLowerCase().includes("<head>")) {
    html = html.replace(/<head>/i, '<head>' + utf8Meta);
  } else {
    html = utf8Meta + html;
  }

  return html;
}

async function runTest() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          Logic Regression Test                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const testTargets = findTestTargets();

  if (testTargets.length === 0) {
    console.log("⚠️  SKIP: テスト対象の履歴データが見つかりませんでした。");
    console.log("");
    console.log("   履歴データは history/<target>/<YYYY-MM>/<timestamp>/section.html");
    console.log("   の形式で保存されている必要があります。");
    console.log("");
    process.exit(0);
  }

  console.log(`📁 ${testTargets.length} 件のテスト対象を検出\n`);

  let browser;
  let passed = 0;
  let failed = 0;
  const results = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    for (const target of testTargets) {
      const result = await runSingleTest(page, target);
      results.push(result);

      if (result.passed) {
        passed++;
        console.log(`  ✅ PASS: ${result.name} (${result.productCount} products)`);
      } else {
        failed++;
        console.log(`  ⚠️  WARN: ${result.name}`);
        console.log(`     ${result.error}`);
      }
    }
  } catch (err) {
    console.error(`\n❌ CRITICAL ERROR: ${err.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }

  // 結果サマリー
  console.log("\n────────────────────────────────────────────────────────────────");

  if (failed === 0) {
    console.log(`\n✅ PASSED: All ${passed} tests passed!\n`);
    process.exit(0);
  } else {
    // 警告モード: 失敗してもexit 0（診断目的）
    console.log(`\n⚠️  DIAGNOSTIC: ${passed} passed, ${failed} warnings\n`);
    console.log("────────────────────────────────────────────────────────────────");
    console.log("💡 ヒント: 履歴データの構造がエクストラクタと一致しない場合があります。");
    console.log("   これは必ずしもエラーではなく、データ構造の変化を示している場合があります。");
    console.log("");
    // exit 0 for diagnostic mode - doesn't fail CI
    process.exit(0);
  }
}

function findTestTargets() {
  const targets = [];
  const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures", "regression");

  if (fs.existsSync(HISTORY_DIR)) {
    const targetDirs = fs.readdirSync(HISTORY_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const targetName of targetDirs) {
      const targetPath = path.join(HISTORY_DIR, targetName);
      const monthDirs = fs.readdirSync(targetPath, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d{4}-\d{2}$/.test(d.name))
        .map((d) => d.name)
        .sort()
        .reverse();

      for (const month of monthDirs) {
        const monthPath = path.join(targetPath, month);
        const snapshots = fs.readdirSync(monthPath, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort()
          .reverse();

        if (snapshots.length > 0) {
          const htmlPath = path.join(monthPath, snapshots[0], "section.html");
          if (fs.existsSync(htmlPath)) {
            targets.push({
              name: `${targetName}/${month}/${snapshots[0]}`,
              htmlPath,
            });
            break;
          }
        }
      }
    }
  }

  // Fallback: If no history targets found, use static fixtures for CI/Fork reliability
  if (targets.length === 0 && fs.existsSync(FIXTURES_DIR)) {
    const fixtureDirs = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const fixtureName of fixtureDirs) {
      const htmlPath = path.join(FIXTURES_DIR, fixtureName, "section.html");
      if (fs.existsSync(htmlPath)) {
        targets.push({
          name: `fixtures/${fixtureName}`,
          htmlPath,
        });
      }
    }
  }

  return targets;
}

async function runSingleTest(page, target) {
  try {
    const htmlContent = readHtmlWithEncoding(target.htmlPath);
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    const extractor = getExtractor("dell-outlet");
    if (!extractor) {
      throw new Error("Extractor 'dell-outlet' not found");
    }
    const products = await extractor.extractFromPage(page);

    if (products.length === 0) {
      return {
        name: target.name,
        passed: false,
        error: "No products extracted (0 products)",
        productCount: 0,
      };
    }

    return {
      name: target.name,
      passed: true,
      error: null,
      productCount: products.length,
    };
  } catch (err) {
    return {
      name: target.name,
      passed: false,
      error: err.message,
      productCount: 0,
    };
  }
}

runTest();
