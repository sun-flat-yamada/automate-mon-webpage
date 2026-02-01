/**
 * @file test-cli.js
 * @description
 * dist/main.js の実行結果（成果物）が正しく生成されているかを確認するバリデーションスクリプト。
 *
 * 前提条件:
 *   1. npm run build を実行済みであること
 *   2. main.js を実行して成果物 (section.png, data.json) を生成済みであること
 *
 * 使用例:
 *   node scripts/test-cli.js                  # カレントディレクトリを検証
 *   OUTPUT_DIR=tests/logs node scripts/test-cli.js  # 指定ディレクトリを検証
 */

import fs from "fs";
import path from "path";

function validate() {
  const outputDir = process.env["OUTPUT_DIR"] || ".";

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          Artifact Validation (test-cli.js)                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\n📁 検証対象ディレクトリ: ${path.resolve(outputDir)}\n`);

  let errors = [];
  let passed = 0;

  const out = (file) => path.join(outputDir, file);

  // 1. スクリーンショットの検証
  const pngPath = out("section.png");
  if (!fs.existsSync(pngPath)) {
    errors.push("section.png が存在しません");
  } else {
    const stats = fs.statSync(pngPath);
    if (stats.size === 0) {
      errors.push("section.png は空ファイルです");
    } else {
      console.log(`  ✅ PASS: section.png (${stats.size} bytes)`);
      passed++;
    }
  }

  // 2. data.json の検証
  const jsonPath = out("data.json");
  if (!fs.existsSync(jsonPath)) {
    errors.push("data.json が存在しません");
  } else {
    try {
      const content = fs.readFileSync(jsonPath, "utf8");
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        errors.push("data.json の内容が配列ではありません");
      } else {
        console.log(`  ✅ PASS: data.json (${data.length} products)`);
        passed++;

        // 構造チェック
        if (data.length > 0) {
          const first = data[0];
          const requiredFields = ["price", "specifications"];
          requiredFields.forEach((field) => {
            if (!(field in first)) {
              errors.push(`Product に必須フィールド "${field}" がありません`);
            }
          });
        }
      }
    } catch (e) {
      errors.push(`data.json のパースに失敗: ${e.message}`);
    }
  }

  // 結果出力
  console.log("\n────────────────────────────────────────────────────────────────");

  if (errors.length > 0) {
    console.log(`\n❌ FAILED: ${passed} passed, ${errors.length} failed\n`);
    errors.forEach((err) => console.log(`  ❌ FAIL: ${err}`));

    console.log("\n────────────────────────────────────────────────────────────────");
    console.log("💡 ヒント: このスクリプトは main.js 実行後の成果物を検証します。");
    console.log("");
    console.log("   成果物を生成するには:");
    console.log("     1. npm run build");
    console.log("     2. TARGET_URL=... TARGET_SELECTOR=... node dist/main.js");
    console.log("");
    console.log("   または VS Code の 'Debug: Main Script (Local Mock)' を実行してください。");
    console.log("────────────────────────────────────────────────────────────────\n");

    process.exit(1);
  } else {
    console.log(`\n✅ PASSED: All ${passed} validations passed!\n`);
    process.exit(0);
  }
}

validate();
