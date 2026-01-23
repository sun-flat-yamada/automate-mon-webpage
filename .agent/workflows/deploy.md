---
description: Deploy changes to GitHub
---

// turbo

1. Stage, commit, and push:
   ```bash
   git add .
   git commit -m "Update configuration and logic"
   git push origin main
   ```

> [!NOTE]
> The GitHub Actions workflow `mon-webpage.yml` will automatically run on schedule (every 30 mins). Pushing code does NOT trigger it immediately unless you manually trigger it or wait for the schedule.
