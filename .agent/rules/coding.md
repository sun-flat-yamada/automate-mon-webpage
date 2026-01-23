---
description: Coding standards and technical guidelines.
globs: "**/*.{js,json,yml,yaml,md}"
---

# Coding Standards

## JavaScript (Node.js/Puppeteer)

- Use `const` and `let` instead of `var`.
- Ensure all Puppeteer actions have reasonable timeouts (default 30-60s).
- Implement error handling for page navigation and selector waiting.
- Always close the browser instance in a `finally` block or at the end of execution.
- Logic should be kept in `scripts/` directory.

## JSON Configuration (`config.json`)

- Maintain valid JSON syntax.
- Targets must have `name`, `url`, and `selector` (optional but recommended).
- `name` should be URL-safe (slug format).

## GitHub Workflows

- Use `lib/actions` or official actions where possible.
- Ensure shell scripts in workflows use `set -e` or `-o pipefail` for safety.
- Document environment variables and secrets required.

## Markdown

- Follow the Documentation Policy (English master, Japanese `.ja.md`).
- Use GitHub Flavored Markdown.
