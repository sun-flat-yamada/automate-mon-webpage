---
name: Find Selector
description: Find the best CSS selector for a specific element on a webpage
---

# Find Selector Skill

This skill helps identifying the robust CSS selector for a text or element on a webpage, which is required for the monitoring configuration.

## Instructions

1. **Understand the Requirement**: Identify which element the user wants to monitor (e.g., "the price of the item", "the stock status text").
2. **Open Browser**: Use `open_browser` to navigate to the target URL.
3. **Inspect Element**: Use the `browser_subagent` to find the unique selector.
   - Prompt the subagent: "Find the unique CSS selector for [description of element]. Prioritize IDs or specific class combinations that look stable. Return ONLY the selector."
4. **Verify**:
   - (Optional) Use `run_entry_point` or `screenshot.js` locally with the found selector to verify it captures the correct data.
5. **Report**: Return the found selector to the user or use it in the `add_target` workflow.
