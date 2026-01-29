const fs = require("fs");
const { JSDOM } = require("jsdom");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node analyze_html.js <path_to_html>");
  process.exit(1);
}
const html = fs.readFileSync(filePath, "latin1");
const dom = new JSDOM(html);
const document = dom.window.document;

const tables = document.querySelectorAll("table");
tables.forEach((table, i) => {
  console.log(`Table ${i}:`);
  const rows = table.querySelectorAll("tr");
  if (rows.length > 0) {
    const firstRowCells = rows[0].querySelectorAll("td, th");
    const headers = Array.from(firstRowCells).map((cell) => cell.textContent.trim());
    console.log("Headers:", headers);
  }
});
