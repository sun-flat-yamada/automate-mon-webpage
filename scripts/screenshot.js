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
          // Auto-scroll to ensure lazy loaded content is visible
          console.log("Scrolling page to trigger lazy loading...");
          await autoScroll(page);

          console.log("Element found. Taking screenshot...");
          await element.screenshot({ path: "section.png" });

          // Extract product information
          console.log("Extracting product information...");
          const products = await page.evaluate((selector) => {
            const container = document.querySelector(selector);
            if (!container) return [];

            // Find all tables within the container
            const tables = Array.from(container.querySelectorAll("table"));
            let productList = [];

            tables.forEach((table) => {
              const rows = Array.from(table.querySelectorAll("tr"));
              if (rows.length < 2) return;

              // Identify columns by header names - handle multi-line and specific labels
              const headers = Array.from(rows[0].querySelectorAll("td, th")).map((c) =>
                c.textContent.trim().replace(/\s+/g, " "),
              );

              const priceIdx = headers.findIndex((h) => h.includes("価格") || h.includes("Price"));
              const specIdx = headers.findIndex(
                (h) => h.includes("仕様") || h.includes("Specifications"),
              );
              const osIdx = headers.findIndex(
                (h) =>
                  h.includes("OS") ||
                  h.includes("Office") ||
                  h.includes("ソフトウェア") ||
                  h.includes("ｿﾌﾄｳｪｱ"),
              );
              const memoryIdx = headers.findIndex((h) => h.includes("メモリ") || h.includes("ﾒﾓﾘ"));
              const hddIdx = headers.findIndex(
                (h) => h.includes("HDD") || h.includes("ストレージ"),
              );
              const videoIdx = headers.findIndex(
                (h) => h.includes("ビデオ") || h.includes("ﾋﾞﾃﾞｵ"),
              );
              const otherIdx = headers.findIndex((h) => h.includes("その他"));

              // If it doesn't look like a product table, skip
              if (priceIdx === -1 && specIdx === -1) {
                // Try searching in the entire first cell text if headers are weirdly structured
                const firstCellText = headers[0] || "";
                if (!firstCellText.includes("価格") && !firstCellText.includes("Price")) return;
              }

              // Extract data from subsequent rows
              for (let i = 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll("td"));
                if (cells.length < headers.length) continue;

                const product = {
                  price:
                    priceIdx !== -1 ? cells[priceIdx].textContent.trim().replace(/\s+/g, " ") : "",
                  specifications:
                    specIdx !== -1 ? cells[specIdx].textContent.trim().replace(/\s+/g, " ") : "",
                  os_office:
                    osIdx !== -1 ? cells[osIdx].textContent.trim().replace(/\s+/g, " ") : "",
                  memory:
                    memoryIdx !== -1
                      ? cells[memoryIdx].textContent.trim().replace(/\s+/g, " ")
                      : "",
                  hdd: hddIdx !== -1 ? cells[hddIdx].textContent.trim().replace(/\s+/g, " ") : "",
                  video_controller:
                    videoIdx !== -1 ? cells[videoIdx].textContent.trim().replace(/\s+/g, " ") : "",
                  others:
                    otherIdx !== -1 ? cells[otherIdx].textContent.trim().replace(/\s+/g, " ") : "",
                };

                // Only add if at least some data is present
                if (Object.values(product).some((v) => v !== "")) {
                  productList.push(product);
                }
              }
            });

            return productList;
          }, targetSelector);

          const fs = require("fs");
          fs.writeFileSync("data.json", JSON.stringify(products, null, 2));
          console.log(`Extracted ${products.length} products to data.json`);
        } else {
          console.error("Element found but could not get handle?");
          process.exit(1);
        }
      } catch (e) {
        console.error(`Timeout or error finding selector: ${targetSelector}`, e);
        process.exit(1);
      }
    } else {
      // Auto-scroll for full page capture too
      console.log("Scrolling page to trigger lazy loading...");
      await autoScroll(page);

      console.log("Taking full page screenshot...");
      await page.screenshot({ path: "section.png", fullPage: true });
      // Create empty data.json if no selector
      const fs = require("fs");
      fs.writeFileSync("data.json", "[]");
    }

    await browser.close();
    console.log("Screenshot saved to section.png");
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
})();

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400; // Small chunks for smooth loading
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          // Scroll back to top if needed, or just stop.
          // For screenshots, we usually want to stay at bottom?
          // Actually, Puppeteer fullPage screenshot works best if we just let it handle the stitching,
          // but we scrolled to trigger lazy load.
          clearInterval(timer);
          resolve();
        }
      }, 200); // Partial wait
    });
  });
  // Extra wait for final settle
  await new Promise((r) => setTimeout(r, 1000));
}
