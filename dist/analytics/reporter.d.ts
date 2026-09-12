/**
 * @file reporter.ts
 * @description
 * 分析レポートのファイル出力（HTML, JSON）およびサマリー表示を担当するモジュール。
 */
import type { FullAnalysisReport } from "./types.js";
export interface ReporterOptions {
    outputDir: string;
}
export declare function generateReportFiles(report: FullAnalysisReport, options: ReporterOptions): {
    htmlPath: string;
    jsonPath: string;
};
export declare function printReportSummary(report: FullAnalysisReport): void;
//# sourceMappingURL=reporter.d.ts.map