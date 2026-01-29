const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const testFile = "mock_test.html";
  const filePath = "file://" + path.resolve(testFile);
  const targetSelector = "body";

  await page.goto(filePath);

  console.log("Extracting product information...");
  const debugInfo = [];
  const products = await page.evaluate((selector) => {
    const tables = Array.from(document.querySelectorAll("table"));
    let productList = [];
    const tableDebug = [];

    tables.forEach((table, tableIdx) => {
      const rows = Array.from(table.querySelectorAll("tr"));
      if (rows.length < 2) return;

      const headers = Array.from(rows[0].querySelectorAll("td, th")).map((c) =>
        c.textContent.trim().replace(/\s+/g, " "),
      );
      tableDebug.push({ index: tableIdx, headers });

      const priceIdx = headers.findIndex((h) => h.includes("価格") || h.includes("Price"));
      const specIdx = headers.findIndex((h) => h.includes("仕様") || h.includes("Specifications"));
      const osIdx = headers.findIndex(
        (h) =>
          h.includes("OS") ||
          h.includes("Office") ||
          h.includes("ソフトウェア") ||
          h.includes("ｿﾌﾄｳｪｱ"),
      );
      const memoryIdx = headers.findIndex((h) => h.includes("メモリ") || h.includes("ﾒﾓﾘ"));
      const hddIdx = headers.findIndex((h) => h.includes("HDD") || h.includes("ストレージ"));
      const videoIdx = headers.findIndex((h) => h.includes("ビデオ") || h.includes("ﾋﾞﾃﾞｵ"));
      const otherIdx = headers.findIndex((h) => h.includes("その他"));

      if (priceIdx === -1 && specIdx === -1) {
        const firstCellText = headers[0] || "";
        if (!firstCellText.includes("価格") && !firstCellText.includes("Price")) return;
      }

      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll("td"));
        if (cells.length < headers.length) continue;

        const product = {
          price: priceIdx !== -1 ? cells[priceIdx].textContent.trim().replace(/\s+/g, " ") : "",
          specifications:
            specIdx !== -1 ? cells[specIdx].textContent.trim().replace(/\s+/g, " ") : "",
          os_office: osIdx !== -1 ? cells[osIdx].textContent.trim().replace(/\s+/g, " ") : "",
          memory: memoryIdx !== -1 ? cells[memoryIdx].textContent.trim().replace(/\s+/g, " ") : "",
          hdd: hddIdx !== -1 ? cells[hddIdx].textContent.trim().replace(/\s+/g, " ") : "",
          video_controller:
            videoIdx !== -1 ? cells[videoIdx].textContent.trim().replace(/\s+/g, " ") : "",
          others: otherIdx !== -1 ? cells[otherIdx].textContent.trim().replace(/\s+/g, " ") : "",
        };

        if (Object.values(product).some((v) => v !== "")) {
          productList.push(product);
        }
      }
    });

    return { productList, tableDebug };
  }, targetSelector);

  console.log("Table Debug (headers found):");
  console.log(JSON.stringify(products.tableDebug, null, 2));
  console.log("\nResults:");
  console.log(JSON.stringify(products.productList, null, 2));

  await browser.close();
})();
