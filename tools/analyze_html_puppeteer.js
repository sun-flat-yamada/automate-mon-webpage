const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error("Usage: node analyze_html_puppeteer.js <path_to_html>");
    process.exit(1);
  }
  const filePath = "file://" + path.resolve(targetFile);

  await page.goto(filePath);

  const tableInfo = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    const results = [];
    tables.forEach((table, i) => {
      const rows = Array.from(table.querySelectorAll("tr"));
      if (rows.length < 2) return;

      // Look for a row that has headers we expect
      const headers = Array.from(rows[0].querySelectorAll("td, th")).map((c) =>
        c.textContent.trim().replace(/\s+/g, " "),
      );
      if (headers.some((h) => h.includes("価格") || h.includes("仕様") || h.includes("OS"))) {
        const sampleRows = rows
          .slice(1)
          .filter((r) => r.cells.length === rows[0].cells.length)
          .map((r) => Array.from(r.cells).map((c) => c.textContent.trim().replace(/\s+/g, " ")));
        results.push({ tableIndex: i, headers, sampleRow: sampleRows[0] });
      }
    });
    return results;
  });

  console.log(JSON.stringify(tableInfo, null, 2));
  await browser.close();
})();
