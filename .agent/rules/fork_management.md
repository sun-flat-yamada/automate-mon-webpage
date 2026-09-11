---
description: Guidelines for managing forks, distinguishing between upstream and origin remotes, branch strategy, and data isolation.
globs: "**/*"
---

# Fork Management Guidelines

## Overview

When this repository (`automate-mon-webpage`) is forked, development and operation must strictly distinguish between **`upstream`** (the canonical repository) and **`origin`** (the user's fork). This document defines rules to prevent merge conflicts, keep PRs clean, and preserve isolated data persistence.

## Remote Roles and Responsibilities

| Remote | Repository | Purpose | Permissions / Scope |
| :--- | :--- | :--- | :--- |
| **`origin`** | Forked Repository | User's working repository, push destination for feature branches, host of the forked `history` branch, and container for fork-specific secrets. | Full read/write access. |
| **`upstream`** | Canonical (`sun-flat-yamada/automate-mon-webpage`) | The authoritative source of truth for code, documentation, workflows, and upstream updates. Destination for Pull Requests. | Read-only (via fetch/pull). |

## Branch & Data Isolation Rules

### 1. The `main` Branch is Pure Code & Configuration
- The `main` branch contains ONLY application source code (`src/`), build outputs (`dist/`), test fixtures (`tests/`), configuration (`config.json`), workflow definitions (`.github/`), and agent definitions (`.agent/`).
- **NEVER** commit runtime monitoring data (`history/`) or local artifacts to `main`.
- In a fork, keep `main` aligned with `upstream/main`. Do not make direct commits on `main` in the fork. Always create feature branches for changes.

### 2. Dedicated `history` Branch for Persistent Data
- All runtime monitoring data (`section.html`, `section.png`, `data.json`, `meta.txt`, `last_hash.txt`) is persisted strictly on the **`history`** branch.
- The `history` branch operates independently per repository:
  - In `upstream`, it records canonical monitoring history.
  - In `origin` (the fork), it records the fork's own monitoring history without affecting upstream.
- Because `history` is completely isolated from `main`, forks can synchronize with `upstream/main` anytime using GitHub's "Sync Fork" or `git merge --ff-only upstream/main` with **zero merge conflicts**.

### 3. Pull Request Guidelines for Fork Contributors
- When creating a Pull Request to `upstream`:
  1. Always branch from the latest `upstream/main` (e.g., `git checkout -b fix/issue-description upstream/main`).
  2. Verify that `history/` is not tracked and contains no staged files (`git status`).
  3. Ensure all tests (`npm test`, `npm run test:encoding`, `node scripts/test-logic-regression.js`, `npm run build`) pass before submitting.
  4. Submit the PR targeting `upstream/main`. **NEVER** include data changes or fork-specific secrets in a PR.

### 4. Secrets & Monitoring Configuration in Forks
- Secrets (`SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `LINE_MESSAGING_API_TOKEN`, `LINE_BOT_USER_ID`) are repository-scoped. A fork does NOT inherit upstream secrets.
- In forks, notifications are automatically skipped if secrets are absent, preventing workflow failures. Users configure their own secrets in `origin` repository settings.
- If a fork modifies `config.json` to monitor custom targets, keep those changes on a dedicated custom branch or be aware that upstream syncs may touch `config.json`.
