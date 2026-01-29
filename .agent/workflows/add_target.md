---
description: Add a new webpage monitoring target
---

1. (Optional) Use the `Find Selector` skill to identify a robust CSS selector if you don't have one.
2. Open `config.json`.
3. Add a new object to the `targets` array with the following fields:
   - `name`: A unique identifier for the site (slug format, e.g. `google-search`).
   - `url`: The full URL to monitor.
   - `selector`: The CSS selector to capture (or leave empty for full page, though selector is recommended).
4. Validate that the file is still valid JSON.
5. (Optional) Run the local test workflow (`/run_local`) to verify the selector works.
6. Review and update documentation if necessary (e.g., `GEMINI.md`).
