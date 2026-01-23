const puppeteer = require("puppeteer");

(async () => {
  const targetUrl = process.env.TARGET_URL;
  const targetSelector = process.env.TARGET_SELECTOR;

  if (!targetUrl) {
    console.error("Error: TARGET_URL environment variable is not set.");
    process.exit(1);
  }

  console.log(`Target URL: ${targetUrl}`);
  console.log(`Target Selector: ${targetSelector || "None (Full Page)"}`);

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for running in some CI environments like GitHub Actions
    });
    const page = await browser.newPage();

    // Set viewport to a reasonable default to ensure content renders
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Navigating to page...");
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 60000 });

    if (targetSelector) {
      console.log(`Waiting for selector: ${targetSelector}`);
      try {
        await page.waitForSelector(targetSelector, { timeout: 30000 });
        const element = await page.$(targetSelector);
        if (element) {
          console.log("Element found. Taking screenshot...");
          await element.screenshot({ path: "section.png" });
        } else {
          console.error("Element found but could not get handle?");
          process.exit(1);
        }
      } catch (e) {
        console.error(`Timeout or error finding selector: ${targetSelector}`, e);
        // Fallback to full page or error out?
        // The workflow expects section.png or it warns.
        // Let's try to take a full page screenshot as debug instead if selector fails?
        // Or just exit 1. The workflow log says "screenshot.js returned error".
        process.exit(1);
      }
    } else {
      console.log("Taking full page screenshot...");
      await page.screenshot({ path: "section.png", fullPage: true });
    }

    await browser.close();
    console.log("Screenshot saved to section.png");
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
})();
