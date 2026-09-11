#!/usr/bin/env node
/**
 * @file fork-helper.js
 * @description
 * Utility helper for managing fork repositories, inspecting remotes (upstream vs origin),
 * checking data isolation, and facilitating safe upstream synchronization.
 *
 * Usage:
 *   node .agent/skills/fork_management/scripts/fork-helper.js status
 *   node .agent/skills/fork_management/scripts/fork-helper.js check-remotes
 *   node .agent/skills/fork_management/scripts/fork-helper.js sync
 */

import { execSync } from "child_process";

const CANONICAL_UPSTREAM_URL = "https://github.com/sun-flat-yamada/automate-mon-webpage.git";

function runGit(cmd, ignoreError = false) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err) {
    if (ignoreError) return null;
    throw err;
  }
}

function getRemotes() {
  const raw = runGit("remote -v", true) || "";
  const remotes = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (match) {
      const [, name, url, type] = match;
      if (!remotes[name]) remotes[name] = {};
      remotes[name][type] = url;
    }
  }
  return remotes;
}

function checkRemotes() {
  console.log("=== Git Remotes Inspection ===");
  const remotes = getRemotes();
  const remoteNames = Object.keys(remotes);

  if (remoteNames.length === 0) {
    console.log("⚠️  No Git remotes configured.");
    return false;
  }

  console.log(`Configured remotes: ${remoteNames.join(", ")}\n`);

  let isFork = false;
  let hasOrigin = "origin" in remotes;
  let hasUpstream = "upstream" in remotes;

  if (hasOrigin) {
    console.log(`  [origin]   (Working Fork / Repo): ${remotes.origin.fetch}`);
  } else {
    console.log("  ⚠️  [origin] remote is missing!");
  }

  if (hasUpstream) {
    console.log(`  [upstream] (Canonical Upstream):  ${remotes.upstream.fetch}`);
    isFork = true;
  } else {
    console.log("  ℹ️  [upstream] remote is not configured.");
    if (hasOrigin && remotes.origin.fetch.includes("sun-flat-yamada/automate-mon-webpage")) {
      console.log("     Currently on canonical repository (upstream == origin).");
    } else {
      console.log("     If this is a fork, add canonical upstream with:");
      console.log(`     git remote add upstream ${CANONICAL_UPSTREAM_URL}`);
    }
  }

  return { remotes, isFork, hasOrigin, hasUpstream };
}

function checkStatus() {
  console.log("=== Fork & Persistence Status ===");
  checkRemotes();

  console.log("\n=== Checking Branch & Data Isolation ===");
  const currentBranch = runGit("branch --show-current", true) || "DETACHED";
  console.log(`Current branch: ${currentBranch}`);

  // Check if history/ is tracked in git index
  const trackedHistory = runGit("ls-files history", true);
  if (trackedHistory && trackedHistory.length > 0) {
    console.log("❌ VIOLATION: 'history/' files are tracked in git index!");
    console.log("   Runtime data must NOT be committed to main.");
    console.log("   Run: git rm -r --cached history/ && git commit -m 'chore: remove history from tracking'");
  } else {
    console.log("✅ PASS: 'history/' is properly untracked in main branch.");
  }

  // Check if history branch exists
  const localHistoryBranch = runGit("branch --list history", true);
  const remoteHistoryBranch = runGit("ls-remote --heads origin history", true);

  console.log(`Local 'history' branch:  ${localHistoryBranch ? "Present" : "Not yet created"}`);
  console.log(`Remote 'history' branch: ${remoteHistoryBranch ? "Present on origin" : "Not yet on origin"}`);
}

function syncUpstream() {
  console.log("=== Syncing with Upstream ===");
  const remotes = getRemotes();
  if (!remotes.upstream) {
    console.error("❌ Error: 'upstream' remote is not configured.");
    console.log(`To add upstream: git remote add upstream ${CANONICAL_UPSTREAM_URL}`);
    process.exit(1);
  }

  const currentBranch = runGit("branch --show-current", true);
  if (currentBranch !== "main") {
    console.error(`❌ Error: You are on branch '${currentBranch}'. Please checkout 'main' before syncing.`);
    process.exit(1);
  }

  // Check for dirty working tree
  const status = runGit("status --porcelain", true);
  if (status && status.length > 0) {
    console.error("❌ Error: Working tree has uncommitted changes. Please commit or stash them before syncing.");
    process.exit(1);
  }

  console.log("1. Fetching upstream/main...");
  runGit("fetch upstream main");

  console.log("2. Fast-forwarding main with upstream/main...");
  try {
    runGit("merge --ff-only upstream/main");
    console.log("✅ Successfully fast-forwarded 'main' with 'upstream/main'!");
  } catch {
    console.error("⚠️  Fast-forward failed. Your local 'main' may have diverged.");
    console.log("   Review commits with: git log upstream/main..main");
  }
}

const command = process.argv[2] || "status";

switch (command) {
  case "status":
    checkStatus();
    break;
  case "check-remotes":
    checkRemotes();
    break;
  case "sync":
    syncUpstream();
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log("Available commands: status, check-remotes, sync");
    process.exit(1);
}
