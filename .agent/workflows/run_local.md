---
description: Run the monitoring logic locally for testing
---

// turbo

1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Set environment variables and run the script.

   **Windows (PowerShell):**

   ```powershell
   $env:TARGET_URL="https://example.com"; $env:TARGET_SELECTOR="#content"; node scripts/screenshot.js
   ```

   **Linux/macOS (Bash):**

   ```bash
   export TARGET_URL="https://example.com" TARGET_SELECTOR="#content"; node scripts/screenshot.js
   ```

3. Check the output:
   - Verify `section.png` was created in the current directory.
   - Check console logs for "Screenshot saved to section.png".
4. If your testing leads to code changes, remember to review and update the documentation (e.g., `GEMINI.md`).
