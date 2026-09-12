/**
 * @file analyzer.ts
 * @description
 * 履歴データの読み込み、在庫増減の追跡 (FIFO)、最短・中央値の滞留時間算出、
 * 曜日・時間帯トレンド分析、および予測情報生成を行うコアエンジン。
 */
import type { Product } from "../extractor.js";
import type { FullAnalysisReport, HistorySnapshot, PredictionInfo, SnapshotMeta, StockEvent, StockInTrend, StockOutStats } from "./types.js";
/**
 * UTC Date から JST (UTC+9) の日時情報を取得する
 */
export declare function getJstInfo(date: Date): {
    day: number;
    hour: number;
    isoJst: string;
};
/**
 * ディレクトリ名 (YYYY-MM-DD-HHMMSS) または ISO 文字列から Date を生成する
 */
export declare function parseTimestamp(str: string): Date | null;
/**
 * meta.txt の内容をパースする
 */
export declare function parseMetaContent(content: string): SnapshotMeta;
/**
 * 製品情報から一意の識別シグネチャを生成する
 */
export declare function createProductSignature(p: Product): string;
/**
 * 数値配列の中央値を算出する
 */
export declare function calculateMedian(numbers: number[]): number | null;
/**
 * 指定ターゲットディレクトリ配下の全スナップショットを取得する
 */
export declare function loadTargetSnapshots(targetDir: string, targetName: string): HistorySnapshot[];
/**
 * タイムラインのスナップショットから在庫増減イベントと滞留時間を算出する (FIFO)
 */
export declare function computeStockEvents(snapshots: HistorySnapshot[]): {
    events: StockEvent[];
    currentStock: Product[];
};
/**
 * 在庫増トレンド（曜日・時間帯分布、周期性）を算出する
 */
export declare function computeStockInTrend(events: StockEvent[]): StockInTrend;
/**
 * 在庫減統計と滞留時間（最短・中央値）を算出する
 */
export declare function computeStockOutStats(events: StockEvent[]): StockOutStats;
/**
 * 統計データから予測情報（次回入荷予測、購入推奨ウィンドウ）を生成する
 */
export declare function generatePrediction(stockIn: StockInTrend, stockOut: StockOutStats): PredictionInfo;
/**
 * history ディレクトリから全ターゲットを読み込み、完全な分析レポートを構築する
 */
export declare function analyzeHistory(historyDir: string, targets: string[], options?: {
    repository?: string | undefined;
}): FullAnalysisReport;
//# sourceMappingURL=analyzer.d.ts.map