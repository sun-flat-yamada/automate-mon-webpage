---
description: Project specific guidelines and architecture overview.
globs: "**/*"
---

# Project Guidelines

## Overview

This repository (`automate-mon-webpage`) is a periodic webpage monitoring system running on GitHub Actions. It detects visual or content changes, takes screenshots, and archives history.

## Architecture

- **Workflow**: `.github/workflows/mon-webpage.yml` (Runs every 30 mins).
- **Core Logic**: `scripts/screenshot.js` (Puppeteer for visual capture).
- **Parser**: `pup` (CLI HTML parser) and `jq` are used in the GitHub Actions environment for content extraction and comparison.
- **Config**: `config.json` defines monitoring targets.
- **History**: `history/<target_name>/` stores artifacts.

## Documentation Policy

- **Master Files**: English documentation is the source of truth.
- **Japanese Versions**: For every markdown file, a Japanese version with `.ja.md` suffix must exist for human reference.
- **Agent Restriction**: AI agents must refer to English masters and MUST NOT read `.ja.md` files for context.

## Language Policy

- **Communications**: All responses and communications with the USER must be in **Japanese**.

## Safety and Integrity

- **Config Validation**: `config.json` must be valid JSON with unique names.
- **History Preservation**: do not delete `history/` files unless explicitly requested.
