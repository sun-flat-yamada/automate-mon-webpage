# GEMINI

## Project Overview

This repository (`automate-mon-webpage`) is a periodic webpage monitoring system running on **GitHub Actions**. It detects visual or content changes in specified webpages, takes screenshots, sends notifications (Slack/LINE/Discord), and archives the history in the repository itself.

## Architecture

- **Workflow**: `.github/workflows/mon-webpage.yml` runs every 30 minutes.
- **Logic**: `scripts/screenshot.js` (Puppeteer) is executed by the workflow to capture screenshots.
- **Dependencies**: Uses `pup` for HTML parsing and `jq` for JSON processing in the GitHub Actions environment.
- **Configuration**: `config.json` defines the monitoring targets.
- **State**: `history/<target_name>/` stores the monitoring history.
  - `last_hash.txt`: Stores the SHA256 hash of the last known state.
  - `<YYYY-MM>/<timestamp>/`: Stores artifacts (HTML, PNG, metadata) of detected changes.

## Data Flow

1. **Schedule**: Runs every 30 minutes (`*/30 * * * *`).
2. **Fetch**: `curl` fetches the page HTML.
3. **Parse**: `pup` extracts the specific DOM element defined by `selector`.
4. **Compare**: SHA256 hash of the extracted HTML is compared against `last_hash.txt`.
5. **Action (if changed)**:
   - **Screenshot**: `node scripts/screenshot.js` (Puppeteer) captures the element.
   - **Notify**: Sends payloads to Slack/LINE via `curl` if secrets are present.
   - **Save**: Commits new hash and artifacts to `history/`.

## Secrets

The system uses the following GitHub Actions secrets for notifications:

- `SLACK_WEBHOOK_URL`
- `LINE_MESSAGING_API_TOKEN`
- `LINE_BOT_USER_ID`
- `DISCORD_WEBHOOK_URL`

## Agent Guidelines

### Language

- **Standard**: All responses and communications with the USER must be in **Japanese** (全てのプロンプト応答・対話は日本語で行うこと).
- **Documentation**: コード変更を行った際は、必ず対応するドキュメントを見直し、新機能や変更内容が反映されるよう更新すること。これはエージェントとしての必須責務である。
- **Self-Sync**: 常に `GEMINI.md` の指示を最優先し、自己の状態とドキュメントの整合性を保つこと。

### Modifying Logic

- **Screenshot Logic**: Edit `scripts/screenshot.js`. This is a standalone Node.js script.
- **Workflow/Schedule**: Edit `.github/workflows/mon-webpage.yml`.

### Managing Targets

- **Add/Remove**: Edit `config.json`. Ensure valid JSON syntax.
- **Testing**: Use the `run_local` workflow to verify selectors locally before committing.

## Workflows

- **Add Target**: See `.agent/workflows/add_target.md`
- **Run Local**: See `.agent/workflows/run_local.md`
- **Deploy**: See `.agent/workflows/deploy.md`
- **Find Selector**: See `.agent/skills/find_selector/SKILL.md` for help identifying robust CSS selectors.

## Strategic Structure

### .agent Directory Overview

| Category         | Description                                                    |
| :--------------- | :------------------------------------------------------------- |
| **rules/**       | Always-follow guidelines for the agent.                        |
| **skills/**      | Complex workflows and domain expertise.                        |
| **agents/**      | Specialized subagents definitions (e.g., `screenshot-expert`). |
| **workflows/**   | Slash commands and automated workflows.                        |
| **examples/**    | Configuration and notification samples.                        |
| **hooks/**       | Definitions for pre/post tool execution hooks.                 |
| **mcp-configs/** | MCP server configuration references.                           |
| **plugins/**     | Extension plugin index.                                        |

### Subagents

- [screenshot-expert](file:///.agent/agents/screenshot-expert.md): Specialist for Puppeteer and element extraction.
- [config-manager](file:///.agent/agents/config-manager.md): Specialist for `config.json` management.
