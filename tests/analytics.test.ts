/**
 * @file analytics.test.ts
 * @description
 * 在庫増減トラッキング、最短・中央値の滞留時間計算、トレンド集計、
 * 予測情報、およびレポート出力の包括的単体テスト。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { Product } from "../src/extractor.js";
import {
  getJstInfo,
  parseTimestamp,
  parseMetaContent,
  createProductSignature,
  calculateMedian,
  computeStockEvents,
  computeStockInTrend,
  computeStockOutStats,
  generatePrediction,
  loadTargetSnapshots,
  analyzeHistory,
} from "../src/analytics/analyzer.js";
import { renderReportHtml } from "../src/analytics/template.js";
import { generateReportFiles } from "../src/analytics/reporter.js";
import type { HistorySnapshot } from "../src/analytics/types.js";

describe("Analytics Module Tests", () => {
  describe("日時・タイムスタンプ処理", () => {
    test("getJstInfo: UTC日時をJSTの曜日と時間に正しく変換する", () => {
      // 2026-09-11 15:00:00 UTC -> 2026-09-12 00:00:00 JST (土曜日, 0時)
      const date = new Date("2026-09-11T15:00:00Z");
      const info = getJstInfo(date);
      expect(info.day).toBe(6); // 土曜
      expect(info.hour).toBe(0);
      expect(info.isoJst).toContain("+09:00");
    });

    test("parseTimestamp: ISO 形式およびディレクトリ名形式をパースできる", () => {
      const d1 = parseTimestamp("2026-02-01T14:02:32+09:00");
      expect(d1).not.toBeNull();
      expect(d1?.getUTCFullYear()).toBe(2026);

      const d2 = parseTimestamp("2026-02-01-140232");
      expect(d2).not.toBeNull();
      expect(d2?.getUTCFullYear()).toBe(2026);
      expect(d2?.getUTCHours()).toBe(14);
      expect(d2?.getUTCMinutes()).toBe(2);
      expect(d2?.getUTCSeconds()).toBe(32);

      expect(parseTimestamp("invalid-timestamp")).toBeNull();
    });

    test("parseMetaContent: meta.txt のキーバリューをパースできる", () => {
      const metaTxt = `Detected at: 2026-02-01T05:02:32Z
Detected at (JST): 2026-02-01T14:02:32+09:00
Repository: test/repo
URL: https://example.com
Selector: #main
Hash: abc12345`;
      const meta = parseMetaContent(metaTxt);
      expect(meta.detectedAt).toBe("2026-02-01T05:02:32Z");
      expect(meta.detectedAtJst).toBe("2026-02-01T14:02:32+09:00");
      expect(meta.repository).toBe("test/repo");
      expect(meta.url).toBe("https://example.com");
      expect(meta.hash).toBe("abc12345");
    });
  });

  describe("アイテムシグネチャと中央値計算", () => {
    test("createProductSignature: 仕様と価格から一意の文字列を生成する", () => {
      const p1: Product = {
        price: "\\100,000",
        specifications: "Core i7",
        memory: "16GB",
        hdd: "512GB SSD",
      };
      const p2: Product = {
        price: "\\100,000",
        specifications: "Core i7",
        memory: "16GB",
        hdd: "512GB SSD",
      };
      const p3: Product = {
        price: "\\120,000",
        specifications: "Core i7",
        memory: "16GB",
        hdd: "512GB SSD",
      };
      expect(createProductSignature(p1)).toBe(createProductSignature(p2));
      expect(createProductSignature(p1)).not.toBe(createProductSignature(p3));
    });

    test("calculateMedian: 配列の中央値を正しく算出する", () => {
      expect(calculateMedian([])).toBeNull();
      expect(calculateMedian([10])).toBe(10);
      expect(calculateMedian([10, 20, 30])).toBe(20);
      expect(calculateMedian([10, 20, 30, 40])).toBe(25);
      expect(calculateMedian([40, 10, 30, 20])).toBe(25); // 順不同
    });
  });

  describe("在庫増減イベント追跡 (FIFO トラッカー) & 滞留時間", () => {
    const itemA: Product = { price: "\\100,000", specifications: "Spec A", memory: "16GB" };
    const itemB: Product = { price: "\\200,000", specifications: "Spec B", memory: "32GB" };

    test("初回スナップショットは初期インベントリとして認識され、在庫増イベントには計上されない", () => {
      const snapshots: HistorySnapshot[] = [
        {
          target: "test_target",
          timestampStr: "2026-09-01-100000",
          timestamp: new Date("2026-09-01T01:00:00Z"),
          timestampJstStr: "2026-09-01T10:00:00+09:00",
          products: [itemA],
          dirPath: "/mock/path/1",
        },
      ];

      const { events, currentStock } = computeStockEvents(snapshots);
      expect(events.length).toBe(0); // 初回はイベントゼロ
      expect(currentStock.length).toBe(1);
      expect(currentStock[0]?.specifications).toBe("Spec A");
    });

    test("2回目以降の新商品出現時に在庫増イベントを検出し、消失時に在庫減イベントと滞留時間を算出する", () => {
      const t1 = new Date("2026-09-01T01:00:00Z"); // 10:00 JST (初期)
      const t2 = new Date("2026-09-01T04:00:00Z"); // 13:00 JST (itemB 入荷, 3時間後)
      const t3 = new Date("2026-09-01T06:30:00Z"); // 15:30 JST (itemB 完売, 入荷から2.5時間=150分後)

      const snapshots: HistorySnapshot[] = [
        {
          target: "test_target",
          timestampStr: "2026-09-01-100000",
          timestamp: t1,
          timestampJstStr: "2026-09-01T10:00:00+09:00",
          products: [itemA],
          dirPath: "/mock/1",
        },
        {
          target: "test_target",
          timestampStr: "2026-09-01-130000",
          timestamp: t2,
          timestampJstStr: "2026-09-01T13:00:00+09:00",
          products: [itemA, itemB], // itemB が追加
          dirPath: "/mock/2",
        },
        {
          target: "test_target",
          timestampStr: "2026-09-01-153000",
          timestamp: t3,
          timestampJstStr: "2026-09-01T15:30:00+09:00",
          products: [itemA], // itemB が完売
          dirPath: "/mock/3",
        },
      ];

      const { events, currentStock } = computeStockEvents(snapshots);

      // イベント: itemB の in (1件) + itemB の out (1件)
      expect(events.length).toBe(2);

      const inEvent = events.find((e) => e.type === "in");
      expect(inEvent).toBeDefined();
      expect(inEvent?.product.specifications).toBe("Spec B");
      expect(inEvent?.timestamp).toEqual(t2);

      const outEvent = events.find((e) => e.type === "out");
      expect(outEvent).toBeDefined();
      expect(outEvent?.product.specifications).toBe("Spec B");
      expect(outEvent?.timestamp).toEqual(t3);
      expect(outEvent?.stockInTimestamp).toEqual(t2);
      expect(outEvent?.durationMinutes).toBe(150); // 2時間30分 = 150分
      expect(outEvent?.durationHours).toBe(2.5);

      expect(currentStock.length).toBe(1);
      expect(currentStock[0]?.specifications).toBe("Spec A");
    });

    test("複数台の同一スペック商品に対する FIFO 在庫減の追跡", () => {
      const t1 = new Date("2026-09-01T00:00:00Z");
      const t2 = new Date("2026-09-01T02:00:00Z"); // 2台入荷
      const t3 = new Date("2026-09-01T03:00:00Z"); // 1台売れる (1時間後)
      const t4 = new Date("2026-09-01T06:00:00Z"); // 残り1台売れる (4時間後)

      const snapshots: HistorySnapshot[] = [
        {
          target: "test_target",
          timestampStr: "snap-1",
          timestamp: t1,
          timestampJstStr: "2026-09-01T09:00:00+09:00",
          products: [],
          dirPath: "/mock/1",
        },
        {
          target: "test_target",
          timestampStr: "snap-2",
          timestamp: t2,
          timestampJstStr: "2026-09-01T11:00:00+09:00",
          products: [itemA, itemA], // 2台入荷
          dirPath: "/mock/2",
        },
        {
          target: "test_target",
          timestampStr: "snap-3",
          timestamp: t3,
          timestampJstStr: "2026-09-01T12:00:00+09:00",
          products: [itemA], // 1台売却
          dirPath: "/mock/3",
        },
        {
          target: "test_target",
          timestampStr: "snap-4",
          timestamp: t4,
          timestampJstStr: "2026-09-01T15:00:00+09:00",
          products: [], // 全て完売
          dirPath: "/mock/4",
        },
      ];

      const { events, currentStock } = computeStockEvents(snapshots);
      expect(events.length).toBe(4); // 2 in + 2 out

      const outEvents = events.filter((e) => e.type === "out");
      expect(outEvents[0]?.durationMinutes).toBe(60); // 1時間 = 60分
      expect(outEvents[1]?.durationMinutes).toBe(240); // 4時間 = 240分

      expect(currentStock.length).toBe(0);
    });
  });

  describe("在庫増トレンドと在庫減統計 (最短・中央値)", () => {
    test("computeStockInTrend: 曜日・時間帯分布とピークを正しく集計する", () => {
      // 水曜日 18:00 JST (09:00 UTC) に2回、木曜日 11:00 JST (02:00 UTC) に1回
      const tWed = new Date("2026-09-09T09:00:00Z"); // Wed
      const tThu = new Date("2026-09-10T02:00:00Z"); // Thu

      const item: Product = { price: "\\100,000", specifications: "Spec" };
      const events: any[] = [
        {
          id: "1",
          type: "in",
          timestamp: tWed,
          timestampJstStr: "2026-09-09T18:00:00+09:00",
          target: "t1",
          product: item,
        },
        {
          id: "2",
          type: "in",
          timestamp: tWed,
          timestampJstStr: "2026-09-09T18:30:00+09:00",
          target: "t1",
          product: item,
        },
        {
          id: "3",
          type: "in",
          timestamp: tThu,
          timestampJstStr: "2026-09-10T11:00:00+09:00",
          target: "t1",
          product: item,
        },
      ];

      const trend = computeStockInTrend(events);
      expect(trend.totalAdded).toBe(3);
      expect(trend.peakDay?.dayNameJa).toBe("水");
      expect(trend.peakDay?.count).toBe(2);
      expect(trend.peakHour?.hour).toBe(18);
      expect(trend.peakHour?.count).toBe(2);
    });

    test("computeStockOutStats: 最短時間と中央値を正しく算出する", () => {
      const item: Product = { price: "\\100,000", specifications: "Spec" };
      // 滞留時間: 30分, 120分, 300分 (中央値: 120分 = 2時間, 最短: 30分)
      const events: any[] = [
        {
          id: "out-1",
          type: "out",
          timestamp: new Date("2026-09-01T05:30:00Z"),
          durationMinutes: 30,
          target: "t1",
          product: item,
        },
        {
          id: "out-2",
          type: "out",
          timestamp: new Date("2026-09-01T07:00:00Z"),
          durationMinutes: 120,
          target: "t1",
          product: item,
        },
        {
          id: "out-3",
          type: "out",
          timestamp: new Date("2026-09-01T10:00:00Z"),
          durationMinutes: 300,
          target: "t1",
          product: item,
        },
      ];

      const stats = computeStockOutStats(events);
      expect(stats.totalRemoved).toBe(3);
      expect(stats.minDurationMinutes).toBe(30); // 最短 30分
      expect(stats.medianDurationMinutes).toBe(120); // 中央値 120分
      expect(stats.averageDurationMinutes).toBe(150); // 平均 (30+120+300)/3 = 150分
      expect(stats.maxDurationMinutes).toBe(300);

      // バケット分類
      const bucketUnder1h = stats.durationBuckets.find((b) => b.label === "< 1 時間");
      expect(bucketUnder1h?.count).toBe(1);
      const bucket1to6h = stats.durationBuckets.find((b) => b.label === "1 〜 6 時間");
      expect(bucket1to6h?.count).toBe(2);
    });

    test("generatePrediction: トレンドと滞留時間から予測を生成する", () => {
      const inTrend = computeStockInTrend([
        {
          id: "1",
          type: "in",
          timestamp: new Date("2026-09-09T09:00:00Z"), // Wed 18:00 JST
          timestampJstStr: "2026-09-09T18:00:00+09:00",
          target: "t",
          product: { price: "1", specifications: "s" },
          productSignature: "s",
        },
      ]);
      const outStats = computeStockOutStats([
        {
          id: "1",
          type: "out",
          timestamp: new Date("2026-09-09T11:00:00Z"),
          durationMinutes: 45,
          timestampJstStr: "2026-09-09T20:00:00+09:00",
          target: "t",
          product: { price: "1", specifications: "s" },
          productSignature: "s",
        },
      ]);

      const pred = generatePrediction(inTrend, outStats);
      expect(pred.nextStockIn.summary).toContain("水曜日");
      expect(pred.purchaseUrgency.summary).toContain("45分");
    });
  });

  describe("レポート生成およびファイル出力", () => {
    test("renderReportHtml: HTML が正しくレンダリングされ、重要キーワードが含まれる", () => {
      const report = analyzeHistory("/non/existent/dir", []);
      const html = renderReportHtml(report);
      expect(html).toContain("Dell Outlet 在庫監視・予測ダッシュボード");
      expect(html).toContain("在庫滞留時間 (最短)");
      expect(html).toContain("在庫滞留時間 (中央値)");
      expect(html).toContain("在庫増の遷移");
      expect(html).toContain("在庫減の遷移");
      expect(html).toContain("予測情報");
    });

    test("generateReportFiles: 一時ディレクトリに index.html と report.json を出力する", () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-test-"));
      try {
        const report = analyzeHistory("/non/existent/dir", []);
        const { htmlPath, jsonPath } = generateReportFiles(report, { outputDir: tempDir });

        expect(fs.existsSync(htmlPath)).toBe(true);
        expect(fs.existsSync(jsonPath)).toBe(true);

        const savedJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        expect(savedJson.generatedAtJst).toBeDefined();
        expect(savedJson.overall).toBeDefined();
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("ディレクトリからの履歴読み込み", () => {
    test("loadTargetSnapshots: 存在しないディレクトリは空配列を返す", () => {
      const snaps = loadTargetSnapshots("/invalid/path", "test");
      expect(snaps).toEqual([]);
    });

    test("実ディレクトリ構造を模したモックデータの解析", () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "history-mock-"));
      try {
        const snapDir = path.join(tempDir, "dell_test", "2026-09", "2026-09-01-120000");
        fs.mkdirSync(snapDir, { recursive: true });

        fs.writeFileSync(
          path.join(snapDir, "data.json"),
          JSON.stringify([{ price: "\\150,000", specifications: "Precision 3660" }])
        );
        fs.writeFileSync(
          path.join(snapDir, "meta.txt"),
          "Detected at (JST): 2026-09-01T12:00:00+09:00\nURL: https://example.com"
        );

        const snaps = loadTargetSnapshots(path.join(tempDir, "dell_test"), "dell_test");
        expect(snaps.length).toBe(1);
        expect(snaps[0]?.products.length).toBe(1);
        expect(snaps[0]?.products[0]?.specifications).toBe("Precision 3660");
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
