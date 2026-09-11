---
name: fork-management
description: >-
  Manage fork repositories, distinguish between upstream and origin remotes,
  sync code from upstream without merge conflicts, and maintain data branch isolation.
  Use when operating in a forked repository or assisting with upstream synchronization and PR workflows.
---

# Fork Management Skill

This skill guides you through managing a fork of `automate-mon-webpage`, keeping `origin` and `upstream` properly distinguished, synchronizing upstream changes without conflicts, and verifying data isolation on the dedicated `history` branch.

## Remote Differentiation

- **`origin`**: Your personal fork (`https://github.com/<your-username>/automate-mon-webpage.git`).
  - Where your feature branches and fork-specific `history` data branch are pushed.
  - Where repository Secrets (`SLACK_WEBHOOK_URL`, etc.) are configured.
- **`upstream`**: The authoritative canonical repository (`https://github.com/sun-flat-yamada/automate-mon-webpage.git`).
  - Source for code updates, bug fixes, and base for Pull Requests.

---

## Workflow Runbook

### Step 1: Verify Remotes Configuration

Check configured remotes and ensure `upstream` points to the canonical repository:

```bash
node .agent/skills/fork_management/scripts/fork-helper.js check-remotes
```

If `upstream` is missing on your fork, configure it:

```bash
git remote add upstream https://github.com/sun-flat-yamada/automate-mon-webpage.git
git fetch upstream
```

### Step 2: Check Branch & Data Isolation Status

Verify that `main` is clean and does not track runtime `history/` data:

```bash
node .agent/skills/fork_management/scripts/fork-helper.js status
```

- **Pass condition**: `history/` is NOT tracked in git index (`ls-files history` is empty).
- All runtime artifacts (`data.json`, `meta.txt`, `section.html`, `section.png`) belong exclusively to the `history` branch.

### Step 3: Safely Synchronize `main` with `upstream`

Because runtime data is isolated on the `history` branch, synchronizing `main` with `upstream` will **never produce merge conflicts**:

```bash
# Ensure working tree is clean
git checkout main
node .agent/skills/fork_management/scripts/fork-helper.js sync
```

Alternatively via native git commands:
```bash
git checkout main
git fetch upstream main
git merge --ff-only upstream/main
git push origin main
```

### Step 4: Create Clean Pull Requests

When contributing fixes or features back to `upstream`:

1. Always create a topic branch branched from the latest `upstream/main`:
   ```bash
   git checkout -b feature/my-enhancement upstream/main
   ```
2. Make code or configuration changes.
3. Validate changes with standard test suite:
   ```bash
   npm run build
   npm test
   npm run test:encoding
   node scripts/test-logic-regression.js
   ```
4. Verify no runtime data (`history/`) is staged:
   ```bash
   git status
   ```
5. Push feature branch to `origin`:
   ```bash
   git push -u origin feature/my-enhancement
   ```
6. Open a Pull Request from `origin/feature/my-enhancement` to `upstream/main`.
