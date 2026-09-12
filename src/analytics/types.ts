/**
 * @file types.ts
 * @description
 * 監視履歴の分析、トレンド予測、およびレポート生成に使用する型定義
 */

import type { Product } from "../extractor.js";

export interface SnapshotMeta {
  detectedAt?: string;
  detectedAtJst?: string;
  url?: string;
  selector?: string;
  hash?: string;
  repository?: string;
}

export interface HistorySnapshot {
  target: string;
  timestampStr: string;
  timestamp: Date;
  timestampJstStr: string;
  products: Product[];
  meta?: SnapshotMeta | undefined;
  dirPath: string;
}

export interface StockEvent {
  id: string;
  type: "in" | "out";
  timestamp: Date;
  timestampJstStr: string;
  target: string;
  product: Product;
  productSignature: string;
  /** 在庫減イベントの場合、対応する入荷日時 */
  stockInTimestamp?: Date | undefined;
  /** 在庫減イベントの場合、入荷からの滞留時間（分） */
  durationMinutes?: number | undefined;
  /** 在庫減イベントの場合、入荷からの滞留時間（時間） */
  durationHours?: number | undefined;
}

export interface DayDistribution {
  day: number; // 0: Sun, 1: Mon, ..., 6: Sat
  dayName: string; // "Sun", "Mon", ...
  dayNameJa: string; // "日", "月", ...
  count: number;
  percentage: number;
}

export interface HourDistribution {
  hour: number; // 0 .. 23
  count: number;
  percentage: number;
}

export interface DurationBucket {
  label: string;
  minMinutes: number;
  maxMinutes: number | null;
  count: number;
  percentage: number;
}

export interface StockInTrend {
  totalAdded: number;
  byDayOfWeek: DayDistribution[];
  peakDay: { dayName: string; dayNameJa: string; count: number; percentage: number } | null;
  byHour: HourDistribution[];
  peakHour: { hour: number; count: number; percentage: number } | null;
  averageIntervalHours: number | null;
  medianIntervalHours: number | null;
  recentEvents: StockEvent[];
}

export interface StockOutStats {
  totalRemoved: number;
  minDurationMinutes: number | null;
  medianDurationMinutes: number | null;
  averageDurationMinutes: number | null;
  maxDurationMinutes: number | null;
  durationBuckets: DurationBucket[];
  byDayOfWeek: DayDistribution[];
  byHour: HourDistribution[];
  recentEvents: StockEvent[];
}

export interface PredictionInfo {
  nextStockIn: {
    recommendedDays: string[];
    recommendedHours: number[];
    confidence: "High" | "Medium" | "Low";
    summary: string;
  };
  purchaseUrgency: {
    fastSelloutMinutes: number | null;
    medianSelloutHours: number | null;
    recommendedCheckHours: number | null;
    summary: string;
  };
}

export interface TargetAnalysis {
  targetName: string;
  currentStock: Product[];
  totalSnapshots: number;
  firstSnapshotDate: string | null;
  lastSnapshotDate: string | null;
  stockIn: StockInTrend;
  stockOut: StockOutStats;
  prediction: PredictionInfo;
}

export interface OverallAnalysis {
  totalSnapshots: number;
  currentStockCount: number;
  firstSnapshotDate: string | null;
  lastSnapshotDate: string | null;
  stockIn: StockInTrend;
  stockOut: StockOutStats;
  prediction: PredictionInfo;
}

export interface FullAnalysisReport {
  generatedAtJst: string;
  repository?: string;
  overall: OverallAnalysis;
  targets: TargetAnalysis[];
}
