/**
 * @file cli.ts
 * @description
 * 監視履歴の分析および GitHub Pages 用レポート生成を行う CLI エントリーポイント。
 * 実行例: node dist/analytics/cli.js --history history --output site
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { analyzeHistory } from "./analyzer.js";
import { generateReportFiles, printReportSummary } from "./reporter.js";

interface CliArgs {
  historyDir: string;
  outputDir: string;
  configPath: string;
  repository?: string | undefined;
}

function detectGitRepository(): string | undefined {
  // 1. GitHub Actions 環境変数
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }

  // 2. ローカル git remote origin url からの抽出
  try {
    const remoteUrl = execSync("git config --get remote.origin.url", { encoding: "utf-8" }).trim();
    const match = /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/.exec(remoteUrl);
    if (match && match[1] && match[2]) {
      return `${match[1]}/${match[2]}`;
    }
  } catch {
    // ignore
  }

  return undefined;
}

function parseArgs(args: string[]): CliArgs {
  let historyDir = "history";
  let outputDir = "site";
  let configPath = "config.json";
  let repository: string | undefined = detectGitRepository();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--history" && i + 1 < args.length) {
      historyDir = args[++i]!;
    } else if (arg === "--output" && i + 1 < args.length) {
      outputDir = args[++i]!;
    } else if (arg === "--config" && i + 1 < args.length) {
      configPath = args[++i]!;
    } else if (arg === "--repository" && i + 1 < args.length) {
      repository = args[++i]!;
    }
  }

  return { historyDir, outputDir, configPath, repository };
}

function getTargetNames(configPath: string, historyDir: string): string[] {
  const targetNames: string[] = [];

  // 1. config.json から取得
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (Array.isArray(config.targets)) {
        for (const t of config.targets) {
          if (t && typeof t.name === "string" && t.name) {
            targetNames.push(t.name);
          }
        }
      }
    } catch (e) {
      console.warn(`Warning: Failed to read config file at ${configPath}:`, e);
    }
  }

  // 2. config.json で見つからなかった場合は historyDir から直接探索
  if (targetNames.length === 0 && fs.existsSync(historyDir)) {
    try {
      const entries = fs.readdirSync(historyDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith(".")) {
          if (e.name === "history") {
            // ネストされた history/history の場合
            const subEntries = fs.readdirSync(path.join(historyDir, e.name), { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory() && !sub.name.startsWith(".")) {
                targetNames.push(sub.name);
              }
            }
          } else {
            targetNames.push(e.name);
          }
        }
      }
    } catch (e) {
      console.warn(`Warning: Failed to inspect history directory:`, e);
    }
  }

  return [...new Set(targetNames)];
}

export async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log("▶ Starting History Analytics & Report Generation...");
  console.log(`  History Directory : ${args.historyDir}`);
  console.log(`  Output Directory  : ${args.outputDir}`);
  console.log(`  Config File       : ${args.configPath}`);

  const targets = getTargetNames(args.configPath, args.historyDir);
  console.log(`  Target Monitored  : [${targets.join(", ")}]`);

  if (args.repository) {
    console.log(`  GitHub Repository : ${args.repository}`);
  }

  if (!fs.existsSync(args.historyDir)) {
    console.warn(`Warning: History directory '${args.historyDir}' does not exist.`);
  }

  const report = analyzeHistory(args.historyDir, targets, { repository: args.repository });
  const { htmlPath, jsonPath } = generateReportFiles(report, { outputDir: args.outputDir });

  printReportSummary(report);

  console.log(`✅ Analysis report generated successfully!`);
  console.log(`   HTML : ${htmlPath}`);
  console.log(`   JSON : ${jsonPath}`);
}

// 直接実行された場合
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("cli.js") || process.argv[1].endsWith("cli.ts"));

if (isDirectRun) {
  run().catch((err) => {
    console.error("❌ Analytics generation failed:", err);
    process.exit(1);
  });
}
