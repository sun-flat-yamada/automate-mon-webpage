/**
 * @file extractor.ts
 * @description
 * 抽出ロジックを抽象化・構造化するためのモジュール。
 * サイトごとの固有ロジックをクラスとして定義する。
 */
/**
 * 抽出器のインターフェース/基底クラス
 */
export class BaseExtractor {
    /**
     * 要素からクリーンなテキストを抽出するユーティリティ
     */
    getCleanText(el) {
        if (!el)
            return "";
        const clone = el.cloneNode(true);
        const toRemove = clone.querySelectorAll("script, style, select, link, button, input");
        toRemove.forEach((node) => node.remove());
        clone.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
        return clone.textContent?.trim().replace(/\s+/g, " ") || "";
    }
}
/**
 * Dell Outlets 向けの汎用抽出器
 */
export class DellOutletExtractor extends BaseExtractor {
    name = "dell-outlet";
    extract(container) {
        const tables = Array.from(container.querySelectorAll("table"));
        let productList = [];
        tables.forEach((table) => {
            const rows = Array.from(table.querySelectorAll("tr"));
            if (rows.length < 2)
                return;
            let headers = [];
            let headerRowIdx = -1;
            // ヘッダー行の特定
            for (let r = 0; r < Math.min(rows.length, 10); r++) {
                const cells = Array.from(rows[r].querySelectorAll("td, th"));
                const rowTexts = cells.map((c) => this.getCleanText(c));
                const hasPrice = rowTexts.some((t) => {
                    const lowerT = t.toLowerCase();
                    return (lowerT.includes("\u4fa1\u683c") || // 価格
                        lowerT.includes("\u00ec\uff98") || // 価格 (mojibake)
                        lowerT.includes("price") ||
                        lowerT.includes("\\") ||
                        lowerT.includes("\u00a5") ||
                        lowerT.includes("no."));
                });
                const hasSpec = rowTexts.some((t) => {
                    const lowerT = t.toLowerCase();
                    return (lowerT.includes("\u4ed5\u69d8") || // 仕様
                        lowerT.includes("spec") ||
                        lowerT.includes("\u30a2\u30a6\u30c8\u30ec\u30c3\u30c8") || // アウトレット
                        lowerT.includes("\uff71\uff73\uff84\uff9a\uff6f\uff84") || // ｱｳﾄﾚｯﾄ
                        lowerT.includes("\u00ef\uff82\uffbd") || // ｱｳﾄﾚｯﾄ (mojibake part)
                        lowerT.includes("model"));
                });
                if (hasPrice && hasSpec) {
                    headers = rowTexts;
                    headerRowIdx = r;
                    break;
                }
            }
            if (headerRowIdx === -1)
                return;
            const findIdx = (terms) => headers.findIndex((h) => {
                const lowerH = h.toLowerCase();
                return terms.some((term) => lowerH.includes(term.toLowerCase()));
            });
            let priceIdx = findIdx(["\u4fa1\u683c", "\u00ec\uff98", "price", "priceall", "\\", "\u00a5"]); // 価格, \, ¥
            let specIdx = findIdx(["\u4ed5\u69d8", "specifications", "spec", "\u54c1\u540d", "\uff71\uff73\uff84\uff9a\uff6f\uff84\u54c1\u540d", "no."]); // 仕様, 品名, ｱｳﾄﾚｯﾄ品名, No
            let osIdx = findIdx(["os", "office", "\u30bd\u30d5\u30c8\u30a6\u30a7\u30a2", "\uff7b\uff8b\uff84\uff73\uffa4\uff67"]); // ソフトウェア, ｿﾌﾄｳｪｱ
            let memoryIdx = findIdx(["\u30e1\u30e2\u30ea", "\uff92\uff93\uff98", "memory", "ram"]); // メモリ, ﾒﾓﾘ, memory, ram
            let hddIdx = findIdx(["hdd", "\u30b9\u30c8\u30ec\u30fc\u30b8"]); // ストレージ
            let opticalIdx = findIdx(["\u5149\u5b66", "optical", "\uff7a\uff73\uff76\uff78"]); // 光学, optical, ｺｳｶﾞｸ
            let videoIdx = findIdx(["\u30d3\u30c7\u30aa", "video", "graphics", "\uff8b\uff9e\uff83\uff75", "controller", "\u30b3\u30f3\u30c8\u30ed\u30fc\u30e9", "\uff7a\uff9d\uff84\uff9b\uff70\uff97"]); // ビデオ, video, ﾋﾞﾃﾞｵ, controller, コントローラ, ｺﾝﾄﾛｰﾗ
            let soundIdx = findIdx(["\u30b5\u30a6\u30f3\u30c9", "sound", "audio", "\uff7b\uff73\uff9d\uff84\uff9e"]); // サウンド, sound, ｻｳﾝﾄﾞ
            let othersIdx = findIdx(["\u305d\u306e\u4ed6", "other", "\uff7f\uff89\uff80"]); // その他, ｿﾉﾀ
            // Fallback: Use data patterns if headers failed
            if (rows.length > headerRowIdx + 1 && rows[headerRowIdx + 1]) {
                const firstDataRow = Array.from(rows[headerRowIdx + 1].querySelectorAll("td")).map(c => this.getCleanText(c));
                if (priceIdx === -1) {
                    priceIdx = firstDataRow.findIndex(t => t.includes("\\") || t.includes("\u00a5"));
                }
                if (specIdx === -1 || specIdx === 0) {
                    // Find column with longest text
                    let maxLen = 0;
                    let maxIdx = -1;
                    firstDataRow.forEach((t, i) => {
                        if (t.length > maxLen && i !== priceIdx) {
                            maxLen = t.length;
                            maxIdx = i;
                        }
                    });
                    if (maxIdx !== -1 && maxLen > 20) {
                        specIdx = maxIdx;
                    }
                }
            }
            for (let i = headerRowIdx + 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll("td"));
                if (cells.length < 2)
                    continue; // Minimal cells required (Price + Spec)
                const product = {
                    price: priceIdx !== -1 ? this.getCleanText(cells[priceIdx]) : "",
                    specifications: specIdx !== -1 ? this.getCleanText(cells[specIdx]) : "",
                    os_office: osIdx !== -1 ? this.getCleanText(cells[osIdx]) : "",
                    memory: memoryIdx !== -1 ? this.getCleanText(cells[memoryIdx]) : "",
                    hdd: hddIdx !== -1 ? this.getCleanText(cells[hddIdx]) : "",
                    video_controller: videoIdx !== -1 ? this.getCleanText(cells[videoIdx]) : "",
                    others: othersIdx !== -1 ? this.getCleanText(cells[othersIdx]) : "",
                };
                // 価格の妥当性チェック
                const hasCurrency = product.price.includes("\\") ||
                    product.price.includes("¥") ||
                    product.price.includes("\u00a5") ||
                    product.price.includes("\u5186"); // 円
                const hasFormattedNumber = /[0-9]{1,3}(,[0-9]{3})+/.test(product.price);
                const isProduct = (hasCurrency || hasFormattedNumber) &&
                    product.specifications.length > 5 &&
                    !product.specifications.toLowerCase().includes("submitget") &&
                    !product.specifications.toLowerCase().includes("frmprodhead");
                if (isProduct) {
                    productList.push(product);
                }
            }
        });
        return productList;
    }
}
/**
 * 抽出器のファクトリ。名前から適切なクラスのインスタンスを返す。
 */
export function getExtractor(type) {
    if (!type)
        return null;
    switch (type.toLowerCase()) {
        case "dell-outlet":
            return new DellOutletExtractor();
        default:
            return null;
    }
}
//# sourceMappingURL=extractor.js.map