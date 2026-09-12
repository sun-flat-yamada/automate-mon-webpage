/**
 * @file analyzer.ts
 * @description
 * 履歴データの読み込み、在庫増減の追跡 (FIFO)、最短・中央値の滞留時間算出、
 * 曜日・時間帯トレンド分析、および予測情報生成を行うコアエンジン。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Product } from "../extractor.js";
import type {
  DayDistribution,
  DurationBucket,
  FullAnalysisReport,
  HistorySnapshot,
  HourDistribution,
  OverallAnalysis,
  PredictionInfo,
  SnapshotMeta,
  StockEvent,
  StockInTrend,
  StockOutStats,
  TargetAnalysis,
} from "./types.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_JA = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * UTC Date から JST (UTC+9) の日時情報を取得する
 */
export function getJstInfo(date: Date): { day: number; hour: number; isoJst: string } {
  const jstTime = date.getTime() + 9 * 60 * 60 * 1000;
  const jstDate = new Date(jstTime);
  const day = jstDate.getUTCDay();
  const hour = jstDate.getUTCHours();
  const isoJst = jstDate.toISOString().replace("Z", "+09:00");
  return { day, hour, isoJst };
}

/**
 * ディレクトリ名 (YYYY-MM-DD-HHMMSS) または ISO 文字列から Date を生成する
 */
export function parseTimestamp(str: string): Date | null {
  if (!str) return null;

  // 1. ISO 形式 (例: 2026-02-01T14:02:32+09:00, 2026-02-01T05:02:32Z)
  if (str.includes("T")) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. ディレクトリ名形式 (YYYY-MM-DD-HHMMSS) - UTC naive としてパース
  const match = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(str);
  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    return new Date(
      Date.UTC(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(hh),
        Number(mm),
        Number(ss)
      )
    );
  }

  return null;
}

/**
 * meta.txt の内容をパースする
 */
export function parseMetaContent(content: string): SnapshotMeta {
  const meta: SnapshotMeta = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key === "Detected at") meta.detectedAt = val;
    else if (key === "Detected at (JST)") meta.detectedAtJst = val;
    else if (key === "URL") meta.url = val;
    else if (key === "Selector") meta.selector = val;
    else if (key === "Hash") meta.hash = val;
    else if (key === "Repository") meta.repository = val;
  }
  return meta;
}

/**
 * 製品情報から一意の識別シグネチャを生成する
 */
export function createProductSignature(p: Product): string {
  const parts = [
    (p.price || "").trim(),
    (p.specifications || "").trim(),
    (p.memory || "").trim(),
    (p.hdd || "").trim(),
    (p.video_controller || "").trim(),
    (p.os_office || "").trim(),
  ];
  return parts.filter(Boolean).join(" | ");
}

/**
 * 数値配列の中央値を算出する
 */
export function calculateMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const first = sorted[mid - 1] ?? 0;
    const second = sorted[mid] ?? 0;
    return (first + second) / 2;
  }
  return sorted[mid] ?? 0;
}

/**
 * 指定ターゲットディレクトリ配下の全スナップショットを取得する
 */
export function loadTargetSnapshots(targetDir: string, targetName: string): HistorySnapshot[] {
  if (!fs.existsSync(targetDir)) return [];

  const snapshots: HistorySnapshot[] = [];

  // targetDir 配下の再帰探索（YYYY-MM/YYYY-MM-DD-HHMMSS 構造を想定）
  function walkDir(dir: string) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    // data.json があるか確認
    const hasData = entries.some((e) => e.isFile() && e.name === "data.json");
    if (hasData) {
      const dirName = path.basename(dir);
      let meta: SnapshotMeta | undefined;
      const metaPath = path.join(dir, "meta.txt");
      if (fs.existsSync(metaPath)) {
        try {
          meta = parseMetaContent(fs.readFileSync(metaPath, "utf-8"));
        } catch {
          // ignore
        }
      }

      // タイムスタンプの決定
      let dt: Date | null = null;
      if (meta?.detectedAt) dt = parseTimestamp(meta.detectedAt);
      if (!dt && meta?.detectedAtJst) dt = parseTimestamp(meta.detectedAtJst);
      if (!dt) dt = parseTimestamp(dirName);

      if (dt) {
        let products: Product[] = [];
        try {
          const raw = fs.readFileSync(path.join(dir, "data.json"), "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            products = parsed as Product[];
          }
        } catch {
          // ignore error
        }

        const { isoJst } = getJstInfo(dt);
        snapshots.push({
          target: targetName,
          timestampStr: dirName,
          timestamp: dt,
          timestampJstStr: isoJst,
          products,
          meta,
          dirPath: dir,
        });
      }
      return;
    }

    for (const e of entries) {
      if (e.isDirectory()) {
        walkDir(path.join(dir, e.name));
      }
    }
  }

  walkDir(targetDir);
  snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return snapshots;
}

interface TrackedLot {
  stockInTimestamp: Date;
  product: Product;
  signature: string;
  isInitialInventory: boolean;
}

/**
 * タイムラインのスナップショットから在庫増減イベントと滞留時間を算出する (FIFO)
 */
export function computeStockEvents(snapshots: HistorySnapshot[]): {
  events: StockEvent[];
  currentStock: Product[];
} {
  const events: StockEvent[] = [];
  const inventoryPool = new Map<string, TrackedLot[]>();

  let eventCounter = 0;

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i]!;
    const isFirstRun = i === 0;

    // 今回のスナップショットのアイテム頻度マップを作成
    const currentItemsMap = new Map<string, Product[]>();
    for (const p of snap.products) {
      const sig = createProductSignature(p);
      if (!sig) continue;
      const list = currentItemsMap.get(sig) || [];
      list.push(p);
      currentItemsMap.set(sig, list);
    }

    if (isFirstRun) {
      // 初回スナップショットは初期インベントリとしてプールに登録
      for (const [sig, products] of currentItemsMap.entries()) {
        const lots: TrackedLot[] = products.map((p) => ({
          stockInTimestamp: snap.timestamp,
          product: p,
          signature: sig,
          isInitialInventory: true,
        }));
        inventoryPool.set(sig, lots);
      }
      continue;
    }

    // 全ての既知シグネチャ（プールにあるもの ＋ 今回現れたもの）
    const allSigs = new Set([...inventoryPool.keys(), ...currentItemsMap.keys()]);

    for (const sig of allSigs) {
      const existingLots = inventoryPool.get(sig) || [];
      const currentProducts = currentItemsMap.get(sig) || [];

      const existingCount = existingLots.length;
      const currentCount = currentProducts.length;

      if (currentCount > existingCount) {
        // 在庫増 (Stock-In)
        const diff = currentCount - existingCount;
        for (let k = 0; k < diff; k++) {
          const product = currentProducts[existingCount + k] || currentProducts[0]!;
          eventCounter++;
          events.push({
            id: `evt-in-${eventCounter}`,
            type: "in",
            timestamp: snap.timestamp,
            timestampJstStr: snap.timestampJstStr,
            target: snap.target,
            product,
            productSignature: sig,
          });

          existingLots.push({
            stockInTimestamp: snap.timestamp,
            product,
            signature: sig,
            isInitialInventory: false,
          });
        }
        inventoryPool.set(sig, existingLots);
      } else if (currentCount < existingCount) {
        // 在庫減 (Stock-Out)
        const diff = existingCount - currentCount;
        for (let k = 0; k < diff; k++) {
          const removedLot = existingLots.shift();
          if (!removedLot) continue;

          const durationMs = Math.max(0, snap.timestamp.getTime() - removedLot.stockInTimestamp.getTime());
          const durationMinutes = Math.round(durationMs / (60 * 1000));
          const durationHours = Number((durationMinutes / 60).toFixed(1));

          eventCounter++;
          events.push({
            id: `evt-out-${eventCounter}`,
            type: "out",
            timestamp: snap.timestamp,
            timestampJstStr: snap.timestampJstStr,
            target: snap.target,
            product: removedLot.product,
            productSignature: sig,
            stockInTimestamp: removedLot.stockInTimestamp,
            durationMinutes: removedLot.isInitialInventory ? undefined : durationMinutes,
            durationHours: removedLot.isInitialInventory ? undefined : durationHours,
          });
        }
        inventoryPool.set(sig, existingLots);
      }
    }
  }

  // 現在残っている在庫一覧
  const currentStock: Product[] = [];
  for (const lots of inventoryPool.values()) {
    for (const lot of lots) {
      currentStock.push(lot.product);
    }
  }

  return { events, currentStock };
}

/**
 * 在庫増トレンド（曜日・時間帯分布、周期性）を算出する
 */
export function computeStockInTrend(events: StockEvent[]): StockInTrend {
  const inEvents = events.filter((e) => e.type === "in");

  // 曜日別集計 (0: Sun .. 6: Sat)
  const dayCounts = new Array<number>(7).fill(0);
  // 時間帯別集計 (0 .. 23)
  const hourCounts = new Array<number>(24).fill(0);

  for (const evt of inEvents) {
    const { day, hour } = getJstInfo(evt.timestamp);
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  }

  const total = inEvents.length;

  const byDayOfWeek: DayDistribution[] = DAY_NAMES.map((name, i) => {
    const count = dayCounts[i] ?? 0;
    return {
      day: i,
      dayName: name,
      dayNameJa: DAY_NAMES_JA[i] ?? "",
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    };
  });

  let peakDayObj: { dayName: string; dayNameJa: string; count: number; percentage: number } | null = null;
  const maxDayCount = Math.max(...dayCounts, 0);
  if (total > 0 && maxDayCount > 0) {
    const maxDayIdx = dayCounts.indexOf(maxDayCount);
    const dayDist = byDayOfWeek[maxDayIdx];
    if (dayDist) {
      peakDayObj = {
        dayName: dayDist.dayName,
        dayNameJa: dayDist.dayNameJa,
        count: dayDist.count,
        percentage: dayDist.percentage,
      };
    }
  }

  const byHour: HourDistribution[] = hourCounts.map((count, hour) => ({
    hour,
    count,
    percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
  }));

  let peakHourObj: { hour: number; count: number; percentage: number } | null = null;
  const maxHourCount = Math.max(...hourCounts, 0);
  if (total > 0 && maxHourCount > 0) {
    const maxHour = hourCounts.indexOf(maxHourCount);
    const hourDist = byHour[maxHour];
    if (hourDist) {
      peakHourObj = {
        hour: maxHour,
        count: hourDist.count,
        percentage: hourDist.percentage,
      };
    }
  }

  // 入荷間隔の計算 (時間単位)
  const intervalsHours: number[] = [];
  for (let i = 1; i < inEvents.length; i++) {
    const prev = inEvents[i - 1]!;
    const curr = inEvents[i]!;
    const diffHours = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60 * 60);
    if (diffHours > 0.1) {
      intervalsHours.push(diffHours);
    }
  }

  const avgInterval =
    intervalsHours.length > 0
      ? Number(
          (
            intervalsHours.reduce((acc, v) => acc + v, 0) / intervalsHours.length
          ).toFixed(1)
        )
      : null;
  const medInterval =
    intervalsHours.length > 0
      ? Number((calculateMedian(intervalsHours) ?? 0).toFixed(1))
      : null;

  // 直近イベント (最新20件、降順)
  const recentEvents = [...inEvents]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);

  return {
    totalAdded: total,
    byDayOfWeek,
    peakDay: peakDayObj,
    byHour,
    peakHour: peakHourObj,
    averageIntervalHours: avgInterval,
    medianIntervalHours: medInterval,
    recentEvents,
  };
}

/**
 * 在庫減統計と滞留時間（最短・中央値）を算出する
 */
export function computeStockOutStats(events: StockEvent[]): StockOutStats {
  const outEvents = events.filter((e) => e.type === "out");

  // 有効な滞留時間（初期在庫ではないもの）
  const validDurations = outEvents
    .map((e) => e.durationMinutes)
    .filter((d): d is number => typeof d === "number" && !isNaN(d));

  const minDuration = validDurations.length > 0 ? Math.min(...validDurations) : null;
  const maxDuration = validDurations.length > 0 ? Math.max(...validDurations) : null;
  const medianDuration = calculateMedian(validDurations);
  const averageDuration =
    validDurations.length > 0
      ? Math.round(
          validDurations.reduce((acc, v) => acc + v, 0) / validDurations.length
        )
      : null;

  // 滞留時間バケット
  const bucketDefs: { label: string; min: number; max: number | null }[] = [
    { label: "< 1 時間", min: 0, max: 60 },
    { label: "1 〜 6 時間", min: 60, max: 360 },
    { label: "6 〜 24 時間", min: 360, max: 1440 },
    { label: "1 〜 3 日", min: 1440, max: 4320 },
    { label: "3 日以上", min: 4320, max: null },
  ];

  const totalValid = validDurations.length;
  const durationBuckets: DurationBucket[] = bucketDefs.map((b) => {
    const count = validDurations.filter((d) => {
      if (b.max === null) return d >= b.min;
      return d >= b.min && d < b.max;
    }).length;
    return {
      label: b.label,
      minMinutes: b.min,
      maxMinutes: b.max,
      count,
      percentage: totalValid > 0 ? Number(((count / totalValid) * 100).toFixed(1)) : 0,
    };
  });

  // 曜日別・時間帯別（購入・処分検知のタイミング）
  const dayCounts = new Array<number>(7).fill(0);
  const hourCounts = new Array<number>(24).fill(0);
  for (const evt of outEvents) {
    const { day, hour } = getJstInfo(evt.timestamp);
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  }

  const totalOut = outEvents.length;

  const byDayOfWeek: DayDistribution[] = DAY_NAMES.map((name, i) => {
    const count = dayCounts[i] ?? 0;
    return {
      day: i,
      dayName: name,
      dayNameJa: DAY_NAMES_JA[i] ?? "",
      count,
      percentage: totalOut > 0 ? Number(((count / totalOut) * 100).toFixed(1)) : 0,
    };
  });

  const byHour: HourDistribution[] = hourCounts.map((count, hour) => ({
    hour,
    count,
    percentage: totalOut > 0 ? Number(((count / totalOut) * 100).toFixed(1)) : 0,
  }));

  // 直近イベント (最新20件、降順)
  const recentEvents = [...outEvents]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);

  return {
    totalRemoved: totalOut,
    minDurationMinutes: minDuration,
    medianDurationMinutes: medianDuration,
    averageDurationMinutes: averageDuration,
    maxDurationMinutes: maxDuration,
    durationBuckets,
    byDayOfWeek,
    byHour,
    recentEvents,
  };
}

/**
 * 統計データから予測情報（次回入荷予測、購入推奨ウィンドウ）を生成する
 */
export function generatePrediction(stockIn: StockInTrend, stockOut: StockOutStats): PredictionInfo {
  // 曜日トップ2
  const sortedDays = [...stockIn.byDayOfWeek]
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
  const recommendedDays = sortedDays.slice(0, 2).map((d) => `${d.dayNameJa}曜日 (${d.percentage}%)`);

  // 時間帯トップ3
  const sortedHours = [...stockIn.byHour]
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);
  const recommendedHours = sortedHours.slice(0, 3).map((h) => h.hour);

  let confidence: "High" | "Medium" | "Low" = "Low";
  if (stockIn.totalAdded >= 20) confidence = "High";
  else if (stockIn.totalAdded >= 5) confidence = "Medium";

  let nextStockInSummary = "十分な入荷履歴データがまだ蓄積されていません。";
  if (sortedDays.length > 0 && sortedHours.length > 0) {
    const daysStr = recommendedDays.join("・");
    const hoursStr = recommendedHours.map((h) => `${h}:00〜${h + 1}:00`).join("、");
    nextStockInSummary = `過去の傾向から、特に【${daysStr}】の【${hoursStr} (JST)】に入荷が集中する傾向があります。`;
  }

  // 滞留時間に基づく購入推奨ウィンドウ
  const minMin = stockOut.minDurationMinutes;
  const medMin = stockOut.medianDurationMinutes;

  let fastSelloutMinutes = minMin;
  let medianSelloutHours = medMin !== null ? Number((medMin / 60).toFixed(1)) : null;

  let recommendedCheckHours: number | null = null;
  let purchaseSummary = "在庫減（完売）の履歴データがまだありません。";

  if (medMin !== null) {
    // 中央値の半分程度（または最短時間付近）を推奨アクションウィンドウとする
    recommendedCheckHours = Math.max(1, Number((medMin / 120).toFixed(1)));
    const minText =
      minMin !== null
        ? minMin < 60
          ? `${minMin}分`
          : `${Number((minMin / 60).toFixed(1))}時間`
        : "不明";
    const medText =
      medMin < 60
        ? `${medMin}分`
        : `${Number((medMin / 60).toFixed(1))}時間`;

    purchaseSummary = `人気商品は入荷から最短【${minText}】で完売しており、通常の在庫も中央値として約【${medText}】で売り切れています。入荷通知を受信後【${recommendedCheckHours}時間以内】の確認・購入判断を推奨します。`;
  }

  return {
    nextStockIn: {
      recommendedDays,
      recommendedHours,
      confidence,
      summary: nextStockInSummary,
    },
    purchaseUrgency: {
      fastSelloutMinutes,
      medianSelloutHours,
      recommendedCheckHours,
      summary: purchaseSummary,
    },
  };
}

/**
 * history ディレクトリから全ターゲットを読み込み、完全な分析レポートを構築する
 */
export function analyzeHistory(historyDir: string, targets: string[]): FullAnalysisReport {
  const targetAnalyses: TargetAnalysis[] = [];
  const allEvents: StockEvent[] = [];
  let totalSnapshotsCount = 0;
  let allMinDate: Date | null = null;
  let allMaxDate: Date | null = null;

  for (const target of targets) {
    // ターゲットディレクトリの解決:
    // 1. historyDir/target
    // 2. historyDir/history/target
    let targetPath = path.join(historyDir, target);
    if (!fs.existsSync(targetPath)) {
      const nestedPath = path.join(historyDir, "history", target);
      if (fs.existsSync(nestedPath)) {
        targetPath = nestedPath;
      }
    }

    const snapshots = loadTargetSnapshots(targetPath, target);
    totalSnapshotsCount += snapshots.length;

    if (snapshots.length > 0) {
      const firstSnap = snapshots[0]!;
      const lastSnap = snapshots[snapshots.length - 1]!;
      if (!allMinDate || firstSnap.timestamp < allMinDate) allMinDate = firstSnap.timestamp;
      if (!allMaxDate || lastSnap.timestamp > allMaxDate) allMaxDate = lastSnap.timestamp;
    }

    const { events, currentStock } = computeStockEvents(snapshots);
    allEvents.push(...events);

    const stockIn = computeStockInTrend(events);
    const stockOut = computeStockOutStats(events);
    const prediction = generatePrediction(stockIn, stockOut);

    const firstSnapDateStr = snapshots[0]?.timestampJstStr ?? null;
    const lastSnapDateStr = snapshots[snapshots.length - 1]?.timestampJstStr ?? null;

    targetAnalyses.push({
      targetName: target,
      currentStock,
      totalSnapshots: snapshots.length,
      firstSnapshotDate: firstSnapDateStr,
      lastSnapshotDate: lastSnapDateStr,
      stockIn,
      stockOut,
      prediction,
    });
  }

  // 全ターゲット合算の総合分析
  const overallStockIn = computeStockInTrend(allEvents);
  const overallStockOut = computeStockOutStats(allEvents);
  const overallPrediction = generatePrediction(overallStockIn, overallStockOut);

  const totalCurrentStock = targetAnalyses.reduce(
    (acc, t) => acc + t.currentStock.length,
    0
  );

  const { isoJst: generatedAtJst } = getJstInfo(new Date());

  const overall: OverallAnalysis = {
    totalSnapshots: totalSnapshotsCount,
    currentStockCount: totalCurrentStock,
    firstSnapshotDate: allMinDate ? getJstInfo(allMinDate).isoJst : null,
    lastSnapshotDate: allMaxDate ? getJstInfo(allMaxDate).isoJst : null,
    stockIn: overallStockIn,
    stockOut: overallStockOut,
    prediction: overallPrediction,
  };

  return {
    generatedAtJst,
    overall,
    targets: targetAnalyses,
  };
}
