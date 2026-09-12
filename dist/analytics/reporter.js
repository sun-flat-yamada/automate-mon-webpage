/**
 * @file reporter.ts
 * @description
 * 分析レポートのファイル出力（HTML, JSON）およびサマリー表示を担当するモジュール。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { renderReportHtml } from "./template.js";
export function generateReportFiles(report, options) {
    const outputDir = path.resolve(options.outputDir);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const htmlContent = renderReportHtml(report);
    const htmlPath = path.join(outputDir, "index.html");
    fs.writeFileSync(htmlPath, htmlContent, "utf-8");
    const jsonContent = JSON.stringify(report, null, 2);
    const jsonPath = path.join(outputDir, "report.json");
    fs.writeFileSync(jsonPath, jsonContent, "utf-8");
    return { htmlPath, jsonPath };
}
export function printReportSummary(report) {
    const overall = report.overall;
    const minMin = overall.stockOut.minDurationMinutes;
    const medMin = overall.stockOut.medianDurationMinutes;
    const minStr = minMin !== null ? (minMin < 60 ? `${minMin}m` : `${(minMin / 60).toFixed(1)}h`) : "N/A";
    const medStr = medMin !== null ? (medMin < 60 ? `${medMin}m` : `${(medMin / 60).toFixed(1)}h`) : "N/A";
    console.log("════════════════════════════════════════════════════════════");
    console.log("             Analytics & Prediction Summary                 ");
    console.log("════════════════════════════════════════════════════════════");
    console.log(`Generated At (JST)    : ${report.generatedAtJst}`);
    console.log(`Total Snapshots Scanned: ${overall.totalSnapshots}`);
    console.log(`Current Stock Count   : ${overall.currentStockCount} units`);
    console.log(`Total Inflow (Added)  : ${overall.stockIn.totalAdded} units`);
    console.log(`Total Outflow (Sold)  : ${overall.stockOut.totalRemoved} units`);
    console.log("────────────────────────────────────────────────────────────");
    console.log(`Stock-Out Min Duration: ${minStr}`);
    console.log(`Stock-Out Med Duration: ${medStr}`);
    console.log(`Peak Stock-In Day     : ${overall.stockIn.peakDay?.dayNameJa || "N/A"}曜日 (${overall.stockIn.peakDay?.count || 0} units)`);
    console.log(`Peak Stock-In Hour    : ${overall.stockIn.peakHour ? overall.stockIn.peakHour.hour + ":00 (JST)" : "N/A"}`);
    console.log("────────────────────────────────────────────────────────────");
    console.log(`Prediction Inflow     : ${overall.prediction.nextStockIn.summary}`);
    console.log(`Prediction Urgency    : ${overall.prediction.purchaseUrgency.summary}`);
    console.log("════════════════════════════════════════════════════════════");
}
//# sourceMappingURL=reporter.js.map