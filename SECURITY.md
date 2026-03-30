# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub Issue** for security vulnerabilities.
2. Instead, please use [GitHub's private vulnerability reporting](https://github.com/sun-flat-yamada/automate-mon-webpage/security/advisories/new) to submit your report.
3. Alternatively, contact the maintainer directly via email.

### What to Include

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if available)

### Response Timeline

- **Acknowledgement**: Within 48 hours of receiving the report.
- **Initial Assessment**: Within 1 week.
- **Fix & Disclosure**: A patch will be developed and released as soon as possible. Public disclosure will be coordinated with the reporter.

## Security Best Practices for Users

### Secrets Management

This project uses GitHub Secrets for sensitive credentials. **Never** commit the following values to the repository:

- `SLACK_WEBHOOK_URL`
- `DISCORD_WEBHOOK_URL`
- `LINE_MESSAGING_API_TOKEN`
- `LINE_BOT_USER_ID`

Always configure these through **Settings → Secrets and variables → Actions**.

### GitHub Actions Permissions

Each workflow explicitly declares minimal permissions using the `permissions` key:

```yaml
permissions:
  contents: write
```

This follows the **principle of least privilege**. The global repository setting should remain at the default ("Read repository contents and packages permissions") — do **not** enable global "Read and write permissions".

### Dependency Security

- **Dependabot Alerts** and **Dependabot Security Updates** are enabled on this repository.
- Dependencies are automatically monitored for known vulnerabilities via `dependabot.yml`.
- Review and merge Dependabot PRs promptly to keep dependencies secure.

### Branch Protection

It is recommended to enable branch protection rules on `main`:

- Require pull requests before merging
- Require status checks (CI) to pass before merging
- Require branches to be up to date before merging

### Third-Party Actions

All GitHub Actions used in this project are pinned to specific major versions:

| Action | Version |
| --- | --- |
| `actions/checkout` | `v4` |
| `actions/setup-node` | `v3` |

Review and update these periodically to include security patches.

## Known Security Considerations

### Puppeteer & Chromium

This project uses Puppeteer to automate a headless Chromium browser. The monitoring workflow:

- Navigates to external URLs defined in `config.json`
- Executes JavaScript in the context of those pages (for data extraction)

**Mitigations**:

- Puppeteer runs in a sandboxed environment within GitHub Actions runners.
- Only URLs explicitly listed in `config.json` are accessed.
- No user input is accepted at runtime — all targets are pre-configured.

### Encoding & Data Integrity

The project handles Shift_JIS and UTF-8 encoded content from Japanese websites. The encoding pipeline includes:

- Browser-side charset detection
- Atomic byte transfer to prevent encoding corruption
- `iconv-lite` for server-side encoding conversion

These measures prevent garbled data from propagating into notifications or stored artifacts.

### Webhook URL Handling

Notification webhook URLs are stored exclusively in GitHub Secrets and accessed via environment variables at runtime. They are never logged or committed.
