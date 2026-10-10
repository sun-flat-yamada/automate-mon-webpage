#!/usr/bin/env node
/**
 * @file extract-section.js
 * @description
 * Cheerio を使用した高速・堅牢な HTML セレクタ抽出スクリプト。
 * 従来の pup バイナリの代替として動作します。
 *
 * 使用例:
 *   node scripts/extract-section.js <selector> [inputFile] [outputFile]
 *   node scripts/extract-section.js ".my-class" page.html section.html
 *   node scripts/extract-section.js "#content" < page.html > section.html
 *   cat page.html | node scripts/extract-section.js "#content"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";

/**
 * Buffer から charset を検出し、適切にデコードして文字列として返す。
 *
 * @param {Buffer | string} buffer - 入力データ
 * @returns {string} デコードされた文字列
 */
export function decodeHtmlBuffer(buffer) {
  if (typeof buffer === "string") {
    return buffer;
  }
  const snippet = buffer.toString("ascii", 0, 10000);
  const charsetMatch = snippet.match(/charset=["']?([a-zA-Z0-9_-]+)/i);
  if (charsetMatch && charsetMatch[1]) {
    const charset = charsetMatch[1].toLowerCase();
    if (charset.includes("shift") || charset.includes("sjis") || charset.includes("cp932")) {
      try {
        return iconv.decode(buffer, "Shift_JIS");
      } catch {
        // フォールバック
      }
    }
    if (charset.includes("euc")) {
      try {
        return iconv.decode(buffer, "EUC-JP");
      } catch {
        // フォールバック
      }
    }
  }
  return buffer.toString("utf-8");
}

/**
 * HTML から指定したセレクタにマッチする要素の outer HTML を抽出する。
 * セレクタが空文字または未指定の場合は元の HTML をそのまま返す。
 *
 * @param {string | Buffer} html - 入力 HTML
 * @param {string} [selector] - CSS セレクタ
 * @returns {string} 抽出された HTML 文字列
 * @throws {Error} セレクタが指定され、かつマッチする要素が 1 件も存在しない場合
 */
export function extractSection(html, selector) {
  const htmlString = typeof html === "string" ? html : decodeHtmlBuffer(html);
  const trimmedSelector = selector ? selector.trim() : "";

  if (!trimmedSelector) {
    return htmlString;
  }

  const $ = cheerio.load(htmlString);
  const matched = $(trimmedSelector);

  if (matched.length === 0) {
    throw new Error(`Selector "${trimmedSelector}" did not match any elements`);
  }

  return matched
    .map((_, el) => $.html(el))
    .get()
    .join("\n");
}

/**
 * 標準入力から全データを読み込む。
 *
 * @returns {Promise<Buffer>}
 */
export async function readStdin() {
  if (process.stdin.isTTY) {
    throw new Error("No input file provided and stdin is a TTY.");
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * CLI 実行用のメインエントリポイント
 *
 * @param {string[]} [argv] - コマンドライン引数
 */
export async function runCli(argv = process.argv.slice(2)) {
  const selector = argv[0] !== undefined ? argv[0] : "";
  const inputFile = argv[1];
  const outputFile = argv[2];

  let rawInput;
  if (inputFile && inputFile !== "-") {
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file "${inputFile}" does not exist`);
      process.exit(1);
    }
    rawInput = fs.readFileSync(inputFile);
  } else {
    try {
      rawInput = await readStdin();
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  }

  const trimmedSelector = selector ? selector.trim() : "";

  // セレクタが空文字の場合は全体 HTML をそのまま出力
  if (!trimmedSelector) {
    if (outputFile && outputFile !== "-") {
      const dir = path.dirname(outputFile);
      if (dir && dir !== "." && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputFile, rawInput);
    } else {
      process.stdout.write(rawInput);
    }
    process.exit(0);
  }

  const html = decodeHtmlBuffer(rawInput);
  let extracted;
  try {
    extracted = extractSection(html, trimmedSelector);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  if (outputFile && outputFile !== "-") {
    const dir = path.dirname(outputFile);
    if (dir && dir !== "." && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputFile, extracted, "utf-8");
  } else {
    process.stdout.write(extracted);
  }
  process.exit(0);
}

// 直接スクリプトとして実行されたか判定
const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    const executedFilePath = path.resolve(process.argv[1]);
    return currentFilePath.toLowerCase() === executedFilePath.toLowerCase();
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  runCli().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
