/**
 * @file template.ts
 * @description
 * GitHub Pages 用のモダン・レスポンシブな分析レポート HTML を生成するテンプレートエンジン。
 * 外部 CDN に依存せず自己完結型 (Zero-Dependency) で高速に動作する。
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function formatDuration(minutes) {
    if (minutes === null || minutes === undefined)
        return "N/A";
    if (minutes < 60)
        return `${minutes} 分`;
    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;
    if (hours < 24) {
        return remainMin > 0 ? `${hours} 時間 ${remainMin} 分` : `${hours} 時間`;
    }
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days} 日 ${remainHours} 時間` : `${days} 日`;
}
function renderBarChart(items, unit = "件") {
    const maxVal = Math.max(...items.map((i) => i.value), 1);
    return `
    <div class="chart-container">
      ${items
        .map((item) => {
        const widthPct = Math.max(2, (item.value / maxVal) * 100);
        const barClass = item.highlight ? "bar-fill highlight" : "bar-fill";
        return `
            <div class="chart-row">
              <div class="chart-label">${escapeHtml(item.label)}</div>
              <div class="chart-bar-track">
                <div class="${barClass}" style="width: ${widthPct}%"></div>
                <span class="chart-val">${item.value}${unit} (${item.percentage}%)</span>
              </div>
            </div>
          `;
    })
        .join("")}
    </div>
  `;
}
function renderEventTable(events, type) {
    if (events.length === 0) {
        return `<div class="empty-state">該当するイベント履歴はありません。</div>`;
    }
    return `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>日時 (JST)</th>
            <th>対象</th>
            <th>価格</th>
            <th>スペック概要</th>
            ${type === "out" ? "<th>入荷からの滞留時間</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${events
        .map((evt) => {
        const spec = evt.product.specifications || "N/A";
        const shortSpec = spec.length > 80 ? spec.slice(0, 80) + "..." : spec;
        const durationCell = type === "out"
            ? `<td class="duration-badge">${formatDuration(evt.durationMinutes)}</td>`
            : "";
        return `
                <tr>
                  <td class="nowrap text-mono">${escapeHtml(evt.timestampJstStr.replace("T", " ").replace("+09:00", ""))}</td>
                  <td><span class="badge target-badge">${escapeHtml(evt.target)}</span></td>
                  <td class="nowrap text-bold text-accent">${escapeHtml(evt.product.price || "N/A")}</td>
                  <td title="${escapeHtml(spec)}">${escapeHtml(shortSpec)}</td>
                  ${durationCell}
                </tr>
              `;
    })
        .join("")}
        </tbody>
      </table>
    </div>
  `;
}
export function renderReportHtml(report) {
    const overall = report.overall;
    const minDurationStr = formatDuration(overall.stockOut.minDurationMinutes);
    const medianDurationStr = formatDuration(overall.stockOut.medianDurationMinutes);
    const avgDurationStr = formatDuration(overall.stockOut.averageDurationMinutes);
    const peakDayStr = overall.stockIn.peakDay
        ? `${overall.stockIn.peakDay.dayNameJa}曜日 (${overall.stockIn.peakDay.count}件, ${overall.stockIn.peakDay.percentage}%)`
        : "集計中";
    const peakHourStr = overall.stockIn.peakHour
        ? `${overall.stockIn.peakHour.hour}:00 〜 ${overall.stockIn.peakHour.hour + 1}:00 (${overall.stockIn.peakHour.count}件, ${overall.stockIn.peakHour.percentage}%)`
        : "集計中";
    // 全ターゲットデータ埋め込み用 JSON
    const reportDataJson = JSON.stringify(report).replace(/</g, "\\u003c");
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dell Outlet 在庫監視・予測分析ダッシュボード</title>
  <meta name="description" content="Dell Outlet の入荷トレンド・在庫減遷移・最短および中央値滞留時間と予測分析レポート">
  <style>
    :root {
      --bg-main: #f8fafc;
      --bg-card: #ffffff;
      --border-color: #e2e8f0;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --primary: #2563eb;
      --primary-light: #eff6ff;
      --success: #10b981;
      --success-light: #ecfdf5;
      --warning: #f59e0b;
      --warning-light: #fffbeb;
      --danger: #ef4444;
      --danger-light: #fef2f2;
      --accent: #0284c7;
      --radius: 12px;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07);
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-main: #0f172a;
        --bg-card: #1e293b;
        --border-color: #334155;
        --text-main: #f8fafc;
        --text-muted: #94a3b8;
        --primary: #3b82f6;
        --primary-light: #1e3a8a33;
        --success: #34d399;
        --success-light: #064e3b33;
        --warning: #fbbf24;
        --warning-light: #78350f33;
        --danger: #f87171;
        --danger-light: #7f1d1d33;
        --accent: #38bdf8;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg-main);
      color: var(--text-main);
      line-height: 1.6;
      padding-bottom: 60px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    header {
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
      padding: 24px 0;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-meta {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .target-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .tab-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 8px 16px;
      border-radius: 8px;
      color: var(--text-main);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      border-color: var(--primary);
    }

    .tab-btn.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
    }

    .kpi-title {
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--primary);
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .kpi-sub {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .kpi-card.highlight {
      border-color: var(--accent);
      background: linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%);
    }

    /* Section Cards */
    .section-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .alert-box {
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .alert-box.info {
      background: var(--primary-light);
      border: 1px solid var(--primary);
      color: var(--text-main);
    }

    .alert-box.warning {
      background: var(--warning-light);
      border: 1px solid var(--warning);
      color: var(--text-main);
    }

    .alert-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .alert-title {
      font-weight: 700;
      margin-bottom: 4px;
    }

    /* 2 Columns */
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 768px) {
      .grid-2col { grid-template-columns: 1fr; }
    }

    /* Chart Rows */
    .chart-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chart-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.875rem;
    }

    .chart-label {
      width: 70px;
      text-align: right;
      font-weight: 600;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .chart-bar-track {
      flex: 1;
      background: var(--border-color);
      border-radius: 6px;
      height: 24px;
      position: relative;
      display: flex;
      align-items: center;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: var(--primary);
      border-radius: 6px;
      transition: width 0.4s ease;
    }

    .bar-fill.highlight {
      background: var(--accent);
    }

    .chart-val {
      position: absolute;
      left: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-main);
      text-shadow: 0 0 2px rgba(255,255,255,0.8);
    }

    /* Table */
    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    .data-table th, .data-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .data-table th {
      background: var(--bg-main);
      font-weight: 600;
      color: var(--text-muted);
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .target-badge {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--primary);
    }

    .duration-badge {
      font-weight: 700;
      color: var(--danger);
      font-family: var(--mono);
    }

    .text-mono { font-family: var(--mono); font-size: 0.8125rem; }
    .text-bold { font-weight: 700; }
    .text-accent { color: var(--accent); }
    .nowrap { white-space: nowrap; }

    .empty-state {
      padding: 32px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    footer {
      text-align: center;
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-top: 40px;
    }
  </style>
</head>
<body>

  <header>
    <div class="container header-content">
      <div>
        <h1>📊 Dell Outlet 在庫監視・予測ダッシュボード</h1>
        <div class="header-meta">
          最終更新: <strong id="header-updated">${escapeHtml(report.generatedAtJst)}</strong> (JST)
        </div>
      </div>
      <div>
        <span class="badge" style="background: var(--success-light); color: var(--success); border: 1px solid var(--success); font-size: 0.875rem;">
          ● 監視稼働中 (自動更新)
        </span>
      </div>
    </div>
  </header>

  <main class="container">

    <!-- ターゲット切り替えタブ -->
    <div class="target-tabs" id="target-tabs">
      <button class="tab-btn active" data-target="overall">全ターゲット総合</button>
      ${report.targets
        .map((t) => `<button class="tab-btn" data-target="${escapeHtml(t.targetName)}">${escapeHtml(t.targetName)}</button>`)
        .join("")}
    </div>

    <!-- エグゼクティブ KPI カード -->
    <div class="kpi-grid">
      <div class="kpi-card highlight">
        <div class="kpi-title">在庫滞留時間 (最短)</div>
        <div class="kpi-value" id="kpi-min-duration" style="color: var(--danger);">${minDurationStr}</div>
        <div class="kpi-sub">人気商品の完売最短スピード</div>
      </div>

      <div class="kpi-card highlight">
        <div class="kpi-title">在庫滞留時間 (中央値)</div>
        <div class="kpi-value" id="kpi-median-duration" style="color: var(--accent);">${medianDurationStr}</div>
        <div class="kpi-sub">平均完売所要時間: <span id="kpi-avg-duration">${avgDurationStr}</span></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">最多入荷ピーク曜日</div>
        <div class="kpi-value" id="kpi-peak-day" style="font-size: 1.35rem;">${peakDayStr}</div>
        <div class="kpi-sub">総入荷検知数: <span id="kpi-total-added">${overall.stockIn.totalAdded}</span> 台</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">最多入荷ピーク時間帯</div>
        <div class="kpi-value" id="kpi-peak-hour" style="font-size: 1.35rem;">${peakHourStr}</div>
        <div class="kpi-sub">JST (日本標準時)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-title">現在の監視状況</div>
        <div class="kpi-value" id="kpi-current-stock">${overall.currentStockCount} 台</div>
        <div class="kpi-sub">総スナップショット数: <span id="kpi-total-snaps">${overall.totalSnapshots}</span></div>
      </div>
    </div>

    <!-- 予測 & アクション推奨サマリー -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">🔮 予測情報 &amp; 推奨購入ウィンドウ</div>
        <span class="badge" id="prediction-confidence" style="background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary);">
          信頼度: ${overall.prediction.nextStockIn.confidence}
        </span>
      </div>

      <div class="alert-box info">
        <div class="alert-icon">📈</div>
        <div>
          <div class="alert-title">次回在庫追加 (入荷) の予測</div>
          <div id="prediction-in-summary">${escapeHtml(overall.prediction.nextStockIn.summary)}</div>
        </div>
      </div>

      <div class="alert-box warning">
        <div class="alert-icon">⚡</div>
        <div>
          <div class="alert-title">完売スピードと購入判断の推奨ウィンドウ</div>
          <div id="prediction-out-summary">${escapeHtml(overall.prediction.purchaseUrgency.summary)}</div>
        </div>
      </div>
    </div>

    <!-- 在庫増の遷移 (トレンド & 類似性) -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">📦 在庫増の遷移 (入荷トレンド・曜日/時間帯の類似性)</div>
        <div class="header-meta">累計入荷数: <strong id="trend-total-added">${overall.stockIn.totalAdded}</strong> 件</div>
      </div>

      <div class="grid-2col">
        <div>
          <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--text-muted);">曜日別 入荷分布 (JST)</h3>
          <div id="chart-in-days">
            ${renderBarChart(overall.stockIn.byDayOfWeek.map((d) => ({
        label: `${d.dayNameJa} (${d.dayName})`,
        value: d.count,
        percentage: d.percentage,
        highlight: overall.stockIn.peakDay?.dayName === d.dayName,
    })))}
          </div>
        </div>

        <div>
          <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--text-muted);">時間帯別 入荷分布 (24時間 JST)</h3>
          <div id="chart-in-hours" style="max-height: 280px; overflow-y: auto;">
            ${renderBarChart(overall.stockIn.byHour.map((h) => ({
        label: `${h.hour}:00`,
        value: h.count,
        percentage: h.percentage,
        highlight: overall.stockIn.peakHour?.hour === h.hour,
    })))}
          </div>
        </div>
      </div>
    </div>

    <!-- 在庫減の遷移 (滞留時間 & 完売タイミング) -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">🛒 在庫減の遷移 (購入・処分タイミング &amp; 滞留時間)</div>
        <div class="header-meta">累計減少数: <strong id="trend-total-removed">${overall.stockOut.totalRemoved}</strong> 件</div>
      </div>

      <div class="grid-2col">
        <div>
          <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--text-muted);">滞留時間レンジ分布 (入荷から完売までの時間)</h3>
          <div id="chart-duration-buckets">
            ${renderBarChart(overall.stockOut.durationBuckets.map((b) => ({
        label: b.label,
        value: b.count,
        percentage: b.percentage,
        highlight: b.percentage >= 30,
    })))}
          </div>
        </div>

        <div>
          <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--text-muted);">購入・在庫減が検知された時間帯 (JST)</h3>
          <div id="chart-out-hours" style="max-height: 280px; overflow-y: auto;">
            ${renderBarChart(overall.stockOut.byHour.map((h) => ({
        label: `${h.hour}:00`,
        value: h.count,
        percentage: h.percentage,
    })))}
          </div>
        </div>
      </div>
    </div>

    <!-- 直近の在庫変動イベント -->
    <div class="grid-2col">
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">📥 直近の入荷履歴</div>
        </div>
        <div id="table-recent-in">
          ${renderEventTable(overall.stockIn.recentEvents, "in")}
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div class="section-title">📤 直近の完売・在庫減履歴</div>
        </div>
        <div id="table-recent-out">
          ${renderEventTable(overall.stockOut.recentEvents, "out")}
        </div>
      </div>
    </div>

  </main>

  <footer>
    <div class="container">
      <p>Automate Mon Webpage Analytics Report &bull; Data Isolation &amp; Fork-Safe GitHub Pages</p>
    </div>
  </footer>

  <!-- クライアントサイドでの動的ターゲット切り替えロジック -->
  <script>
    const reportData = ${reportDataJson};

    function formatDuration(minutes) {
      if (minutes === null || minutes === undefined) return "N/A";
      if (minutes < 60) return minutes + " 分";
      const hours = Math.floor(minutes / 60);
      const remainMin = minutes % 60;
      if (hours < 24) {
        return remainMin > 0 ? hours + " 時間 " + remainMin + " 分" : hours + " 時間";
      }
      const days = Math.floor(hours / 24);
      const remainHours = hours % 24;
      return remainHours > 0 ? days + " 日 " + remainHours + " 時間" : days + " 日";
    }

    function renderBarChart(items, unit = "件") {
      const maxVal = Math.max(...items.map((i) => i.value), 1);
      return '<div class="chart-container">' + items.map((item) => {
        const widthPct = Math.max(2, (item.value / maxVal) * 100);
        const barClass = item.highlight ? "bar-fill highlight" : "bar-fill";
        return '<div class="chart-row">' +
          '<div class="chart-label">' + item.label + '</div>' +
          '<div class="chart-bar-track">' +
            '<div class="' + barClass + '" style="width: ' + widthPct + '%"></div>' +
            '<span class="chart-val">' + item.value + unit + ' (' + item.percentage + '%)</span>' +
          '</div>' +
        '</div>';
      }).join("") + '</div>';
    }

    function escapeHtml(str) {
      if (!str) return "";
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function renderEventTable(events, type) {
      if (!events || events.length === 0) {
        return '<div class="empty-state">該当するイベント履歴はありません。</div>';
      }
      return '<div class="table-responsive"><table class="data-table"><thead><tr>' +
        '<th>日時 (JST)</th><th>対象</th><th>価格</th><th>スペック概要</th>' +
        (type === "out" ? '<th>入荷からの滞留時間</th>' : '') +
        '</tr></thead><tbody>' +
        events.map((evt) => {
          const spec = (evt.product && evt.product.specifications) || "N/A";
          const shortSpec = spec.length > 80 ? spec.slice(0, 80) + "..." : spec;
          const durationCell = type === "out" ? '<td class="duration-badge">' + formatDuration(evt.durationMinutes) + '</td>' : '';
          return '<tr>' +
            '<td class="nowrap text-mono">' + escapeHtml(evt.timestampJstStr.replace("T", " ").replace("+09:00", "")) + '</td>' +
            '<td><span class="badge target-badge">' + escapeHtml(evt.target) + '</span></td>' +
            '<td class="nowrap text-bold text-accent">' + escapeHtml(evt.product.price || "N/A") + '</td>' +
            '<td title="' + escapeHtml(spec) + '">' + escapeHtml(shortSpec) + '</td>' +
            durationCell +
          '</tr>';
        }).join("") +
        '</tbody></table></div>';
    }

    function updateView(targetName) {
      let data;
      if (targetName === "overall") {
        data = {
          stockIn: reportData.overall.stockIn,
          stockOut: reportData.overall.stockOut,
          prediction: reportData.overall.prediction,
          currentStockCount: reportData.overall.currentStockCount,
          totalSnapshots: reportData.overall.totalSnapshots
        };
      } else {
        const targetObj = reportData.targets.find((t) => t.targetName === targetName);
        if (!targetObj) return;
        data = {
          stockIn: targetObj.stockIn,
          stockOut: targetObj.stockOut,
          prediction: targetObj.prediction,
          currentStockCount: targetObj.currentStock.length,
          totalSnapshots: targetObj.totalSnapshots
        };
      }

      document.getElementById("kpi-min-duration").innerText = formatDuration(data.stockOut.minDurationMinutes);
      document.getElementById("kpi-median-duration").innerText = formatDuration(data.stockOut.medianDurationMinutes);
      document.getElementById("kpi-avg-duration").innerText = formatDuration(data.stockOut.averageDurationMinutes);

      const peakDay = data.stockIn.peakDay;
      document.getElementById("kpi-peak-day").innerText = peakDay ? peakDay.dayNameJa + "曜日 (" + peakDay.count + "件, " + peakDay.percentage + "%)" : "集計中";
      document.getElementById("kpi-total-added").innerText = data.stockIn.totalAdded;

      const peakHour = data.stockIn.peakHour;
      document.getElementById("kpi-peak-hour").innerText = peakHour ? peakHour.hour + ":00 〜 " + (peakHour.hour + 1) + ":00 (" + peakHour.count + "件, " + peakHour.percentage + "%)" : "集計中";

      document.getElementById("kpi-current-stock").innerText = data.currentStockCount + " 台";
      document.getElementById("kpi-total-snaps").innerText = data.totalSnapshots;

      document.getElementById("prediction-confidence").innerText = "信頼度: " + data.prediction.nextStockIn.confidence;
      document.getElementById("prediction-in-summary").innerText = data.prediction.nextStockIn.summary;
      document.getElementById("prediction-out-summary").innerText = data.prediction.purchaseUrgency.summary;

      document.getElementById("trend-total-added").innerText = data.stockIn.totalAdded;
      document.getElementById("trend-total-removed").innerText = data.stockOut.totalRemoved;

      // Charts
      document.getElementById("chart-in-days").innerHTML = renderBarChart(
        data.stockIn.byDayOfWeek.map((d) => ({
          label: d.dayNameJa + " (" + d.dayName + ")",
          value: d.count,
          percentage: d.percentage,
          highlight: data.stockIn.peakDay && data.stockIn.peakDay.dayName === d.dayName
        }))
      );

      document.getElementById("chart-in-hours").innerHTML = renderBarChart(
        data.stockIn.byHour.map((h) => ({
          label: h.hour + ":00",
          value: h.count,
          percentage: h.percentage,
          highlight: data.stockIn.peakHour && data.stockIn.peakHour.hour === h.hour
        }))
      );

      document.getElementById("chart-duration-buckets").innerHTML = renderBarChart(
        data.stockOut.durationBuckets.map((b) => ({
          label: b.label,
          value: b.count,
          percentage: b.percentage,
          highlight: b.percentage >= 30
        }))
      );

      document.getElementById("chart-out-hours").innerHTML = renderBarChart(
        data.stockOut.byHour.map((h) => ({
          label: h.hour + ":00",
          value: h.count,
          percentage: h.percentage
        }))
      );

      document.getElementById("table-recent-in").innerHTML = renderEventTable(data.stockIn.recentEvents, "in");
      document.getElementById("table-recent-out").innerHTML = renderEventTable(data.stockOut.recentEvents, "out");
    }

    // イベントリスナー設定
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        updateView(btn.getAttribute("data-target"));
      });
    });
  </script>
</body>
</html>
`;
}
//# sourceMappingURL=template.js.map