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
import { getExtractor, type Product } from "./extractor.js";

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
      const productsResult: Product[] = await extractor.extractFromPage(page, targetSelector);
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
