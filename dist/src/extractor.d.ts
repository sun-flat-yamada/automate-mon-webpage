/**
 * @file extractor.ts
 * @description
 * 抽出ロジックを抽象化・構造化するためのモジュール。
 * サイトごとの固有ロジックをクラスとして定義する。
 */
export interface Product {
    price: string;
    specifications: string;
    os_office?: string;
    memory?: string;
    hdd?: string;
    video_controller?: string;
    others?: string;
}
/**
 * 抽出器のインターフェース/基底クラス
 */
export declare abstract class BaseExtractor {
    abstract name: string;
    /**
     * 指定されたコンテナから製品情報を抽出する
     */
    abstract extract(container: Element | Document): Product[];
    /**
     * 要素からクリーンなテキストを抽出するユーティリティ
     */
    protected getCleanText(el: Element | null | undefined): string;
}
/**
 * Dell Outlets 向けの汎用抽出器
 */
export declare class DellOutletExtractor extends BaseExtractor {
    name: string;
    extract(container: Element | Document): Product[];
}
/**
 * 抽出器のファクトリ。名前から適切なクラスのインスタンスを返す。
 */
export declare function getExtractor(type: string | undefined): BaseExtractor | null;
//# sourceMappingURL=extractor.d.ts.map