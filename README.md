# Automate Webpage Monitor

[English](./README.md) | [日本語](./README.ja.md)

[![CI (Build & Test)](https://github.com/sun-flat-yamada/automate-mon-webpage/actions/workflows/ci.yml/badge.svg)](https://github.com/sun-flat-yamada/automate-mon-webpage/actions/workflows/ci.yml)
[![Webpage Monitor](https://github.com/sun-flat-yamada/automate-mon-webpage/actions/workflows/mon-webpage.yml/badge.svg)](https://github.com/sun-flat-yamada/automate-mon-webpage/actions/workflows/mon-webpage.yml)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sun.flat.yamada)

A robust webpage monitoring system powered by **GitHub Actions** and **TypeScript**. It detects visual or content changes, captures screenshots, extracts structured data, and sends notifications via Slack, LINE, and Discord.

## 🚀 Features

- **Automated Scheduling**: Runs every 30 minutes via GitHub Actions.
- **Modular Data Extraction**: Intelligent extraction of product data (prices, specs) using a TypeScript-based modular engine.
- **Visual Evidence**: Captures element-specific or full-page screenshots using Puppeteer.
- **Multi-Channel Notifications**: Real-time alerts with JST timestamps and product lists sent to Slack, LINE, and Discord.
- **Robust Encoding Support**: Automatically handles mixed environments (Shift_JIS historical data vs UTF-8 modern data) with browser-side charset detection and atomic byte transfer.
- **Resilient Data Extraction**: Implements fallback logic to infer column indices (Price, Specs) even when table headers are missing or garbled.

## 🏗 Architecture

- **CI Workflow**: `.github/workflows/ci.yml` handles building, testing, and updating compiled files.
- **Monitoring Workflow**: `.github/workflows/mon-webpage.yml` runs every 30 minutes to track changes.
- **Engine**: Puppeteer (Chromium) for browser automation.
- **Logic**:
  - `src/main.ts`: Entry point for monitoring and screenshots. Handles raw file bytes to prevent encoding corruption.
  - `src/extractor.ts`: Modular data extraction engine with fallback strategies for unstructured tables.
- **Infrastructure**: GitHub Actions for periodic execution and deployment.

## 🔄 Workflows

### 1. Webpage Monitor (`mon-webpage.yml`)

- **Schedule**: Runs every 30 minutes.
- **Function**: Checks for updates, captures screenshots, extracts data, and sends notifications.
- **Auto-Commit**: Saves results to `history/` directory.

### 2. CI / Build & Test (`ci.yml`)

- **Trigger**: Push or Pull Request to `main` branch.
- **Function**: Installs dependencies, runs `npm run build`, and executes tests.
- **Auto-Commit**: If changes are detected in `dist/` (compiled JS), it automatically commits and pushes them back to the repository. This ensures the runtime code is always up-to-date without manual compilation.

## 📂 Project Structure

- `src/`: TypeScript source code (The Source of Truth).
- `dist/`: Compiled JavaScript (Referenced by GitHub Actions).
- `tests/`: Test suite for extraction logic and regressions.
- `scripts/`: Utility scripts for testing and maintenance.
- `history/`: Change detection history (artifacts).
- `config.json`: Monitoring targets definition.

## 🛠 Development Workflow

Follow this logical sequence for any changes:

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Compile**:

   ```bash
   npm run build
   ```

3. **Test**:

   ```bash
   # Run Unit Tests with Coverage
   npm run test:coverage

   # Run Logic Regression (requires history data)
   node scripts/test-logic-regression.js

   # Run Encoding Robustness Test (Shift_JIS/UTF-8 verification)
   npm run test:encoding

   # Run Artifact Validation (after main.js execution)
   node scripts/test-cli.js
   ```

4. **Local Verification**:
   Use the VS Code debug configuration "Debug: Main Script (Local Mock)" or set environment variables and run `node dist/main.js`.

## ⚙️ Configuration (`config.json`)

```json
{
  "targets": [
    {
      "name": "target_identifier",
      "url": "https://example.com/item",
      "selector": "#target-element",
      "extractor_type": "dell-outlet"
    }
  ]
}
```

- `extractor_type`: Specifies the extraction strategy. Currently supports `dell-outlet`. If omitted, data extraction (`data.json`) will be skipped.

---

## 🔧 GitHub Setup

Instructions for configuring this repository on GitHub.

### ✅ Required Settings

These settings are **mandatory** for the repository to function correctly.

#### 1. Enable GitHub Actions

1. Go to repository **Settings** → **Actions** → **General**
2. Under **Actions permissions**, select "Allow all actions and reusable workflows"
3. Click "Save"

> [!NOTE]
> The workflows (`mon-webpage.yml`, `ci.yml`) define their own `permissions: contents: write`, so you do **not** need to enable global "Read and write permissions". The default "Read repository contents..." is secure and sufficient.

#### 2. Configure Secrets (For Notifications)

To use notifications, configure the following Secrets. Unconfigured channels will be skipped.

| Secret Name | Description | How to Obtain |
| --- | --- | --- |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | Create at [Slack API](https://api.slack.com/messaging/webhooks) |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL (Comma-separated for multiple) | Server Settings → Integrations → Webhooks |
| `LINE_MESSAGING_API_TOKEN` | LINE Messaging API Channel Access Token | Create Bot at [LINE Developers](https://developers.line.biz/) |
| `LINE_BOT_USER_ID` | Target LINE User ID | Check in LINE Developers Console |

**Steps**:

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Enter Name and Value, then save

#### 3. CI Workflow Setup (Optional)

The CI workflow (`ci.yml`) works automatically without any configuration. However, please note:

> [!WARNING]
> If you enable **Branch Protection Rules** on `main`, the CI workflow's **auto-commit feature** (pushing compiled files back to `main`) will fail because the bot cannot bypass the protection.
>
> **For Free/Pro Plans (Personal Repositories):**
> GitHub does not support bypassing protection rules for Bots on the Free plan. To ensure CI passes:
>
> 1. Run `npm run build` locally before commiting.
> 2. Commit the updated `dist/` files manually.
> 3. Push your changes. (This ensures `dist/` is already up-to-date, so the CI workflow will skip the commit step).
>
> **For Enterprise/Organization Plans:**
> You can allow the bot to bypass the rules:
>
> 1. Go to **Settings** → **Branches** → **Edit** (next to your rule).
> 2. Check **"Allow specified actors to bypass required pull requests"**.
> 3. Search for and add `github-actions[bot]`.
> 4. Click **Save changes**.

---

### 💡 Best Practices

Recommended settings for stable operation.

#### Branch Protection Rules

Protect the main branch to prevent unintended changes.

1. **Settings** → **Branches** → **Add branch protection rule**
2. **Branch name pattern**: `main`
3. Recommended options:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ⬜ Do not require approvals (for personal repositories)

> [!NOTE]
> Commits by the GitHub Actions Bot (`github-actions[bot]`) bypass these rules and are pushed automatically.

#### Enable Dependabot

Automate security updates for dependencies.

1. **Settings** → **Code security and analysis**
2. **Dependabot alerts**: Enable
3. **Dependabot security updates**: Enable

#### Schedule Execution Notes

- GitHub Actions cron schedule is based on UTC.
- `*/30 * * * *` runs "every 30 minutes" (Note: execution may be delayed by a few minutes due to GitHub load).
- Scheduled execution may be automatically disabled for repositories with no activity for a long period.

> [!TIP]
> If scheduled execution stops, you can restart it by manually running the workflow via `workflow_dispatch`.

---

## 🔔 Notifications

Requires GitHub Secrets configuration (see "Configure Secrets" above).

Channel Behavior:

- **Slack**: Text message + Product list
- **Discord**: Embedded message + Screenshot image
- **LINE**: Text message + Base64 encoded image (Uses Messaging API)

## 🤝 Contribution & Support

Contributions are welcome! If you find this extension useful, please consider supporting its development.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sun.flat.yamada)

## 📜 License

MIT
