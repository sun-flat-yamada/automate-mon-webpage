/**
 * @file extractor.test.ts
 * @description
 * DellOutletExtractor の仕様ベーステスト。
 * 実装の詳細（How）ではなく、振る舞い（What）をテストする。
 *
 * @jest-environment jsdom
 */
import { getExtractor, DellOutletExtractor, type Product } from '../src/extractor';

describe('getExtractor ファクトリ関数', () => {
    test('有効な型名 "dell-outlet" を渡すと DellOutletExtractor を返す', () => {
        const extractor = getExtractor('dell-outlet');
        expect(extractor).toBeInstanceOf(DellOutletExtractor);
        expect(extractor?.name).toBe('dell-outlet');
    });

    test('大文字小文字を区別しない', () => {
        expect(getExtractor('Dell-Outlet')).toBeInstanceOf(DellOutletExtractor);
        expect(getExtractor('DELL-OUTLET')).toBeInstanceOf(DellOutletExtractor);
    });

    test('未知の型名には null を返す', () => {
        expect(getExtractor('unknown')).toBeNull();
        expect(getExtractor('amazon')).toBeNull();
    });

    test('undefined/空文字には null を返す', () => {
        expect(getExtractor(undefined)).toBeNull();
        expect(getExtractor('')).toBeNull();
    });
});

describe('DellOutletExtractor 製品抽出', () => {
    let extractor: DellOutletExtractor;

    beforeEach(() => {
        extractor = new DellOutletExtractor();
        document.body.innerHTML = '';
    });

    describe('正常系: 製品の抽出', () => {
        test('価格と仕様を含む行から製品情報を抽出できる', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>¥100,000</td><td>OptiPlex 7000 Desktop</td></tr>
                </table>
            `;

            const products = extractor.extract(document.body);

            expect(products).toHaveLength(1);
            expect(products[0]?.price).toBe('¥100,000');
            expect(products[0]?.specifications).toBe('OptiPlex 7000 Desktop');
        });

        test('複数の製品行を正しく抽出できる', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>¥85,000</td><td>OptiPlex 7000</td></tr>
                    <tr><td>¥150,000</td><td>Precision 3660</td></tr>
                    <tr><td>¥200,000</td><td>XPS 8940 Desktop</td></tr>
                </table>
            `;

            const products = extractor.extract(document.body);
            expect(products).toHaveLength(3);
        });

        test('オプショナルフィールド（OS, メモリ, HDD, ビデオ）を抽出できる', () => {
            document.body.innerHTML = `
                <table>
                    <tr>
                        <th>価格</th>
                        <th>仕様</th>
                        <th>OS</th>
                        <th>メモリ</th>
                        <th>HDD</th>
                        <th>ビデオ</th>
                    </tr>
                    <tr>
                        <td>¥120,000</td>
                        <td>OptiPlex 7000</td>
                        <td>Windows 11 Pro</td>
                        <td>16GB</td>
                        <td>512GB SSD</td>
                        <td>Intel UHD Graphics</td>
                    </tr>
                </table>
            `;

            const products = extractor.extract(document.body);

            expect(products).toHaveLength(1);
            expect(products[0]?.os_office).toBe('Windows 11 Pro');
            expect(products[0]?.memory).toBe('16GB');
            expect(products[0]?.hdd).toBe('512GB SSD');
            expect(products[0]?.video_controller).toBe('Intel UHD Graphics');
        });
    });

    describe('ヘッダー認識', () => {
        test('英語ヘッダー (price, specifications) を認識する', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>Price</th><th>Specifications</th></tr>
                    <tr><td>¥99,000</td><td>Dell Desktop Model X</td></tr>
                </table>
            `;

            const products = extractor.extract(document.body);
            expect(products).toHaveLength(1);
        });

        test('半角カナヘッダーを認識する', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>No.</th><th>ｱｳﾄﾚｯﾄ</th><th>\uff92\uff93\uff98</th><th>\uff8b\uff9e\uff83\uff75</th></tr>
                    <tr><td>¥88,000</td><td>Outlet Desktop</td><td>8GB</td><td>Radeon</td></tr>
                </table>
            `;

            const products = extractor.extract(document.body);
            expect(products).toHaveLength(1);
            expect(products[0]?.memory).toBe('8GB');
            expect(products[0]?.video_controller).toBe('Radeon');
        });

        test('英語/混在ヘッダー (Memory, Controller) を認識する', () => {
             document.body.innerHTML = `
                <table>
                    <tr><th>Price</th><th>Spec</th><th>Memory</th><th>Controller</th></tr>
                    <tr><td>¥95,000</td><td>New Desktop</td><td>16GB</td><td>NVIDIA</td></tr>
                </table>
            `;
            const products = extractor.extract(document.body);
            expect(products).toHaveLength(1);
            expect(products[0]?.memory).toBe('16GB');
            expect(products[0]?.video_controller).toBe('NVIDIA');
        });
    });

    describe('価格認識', () => {
        test('円記号 (¥) を含む価格を認識する', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>¥150,000</td><td>Valid Product</td></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(1);
        });

        test('「円」を含む価格を認識する', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>150,000円</td><td>Valid Product</td></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(1);
        });

        test('カンマ区切りの数値フォーマットを認識する', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>150,000</td><td>Valid Product Here</td></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(1);
        });
    });

    describe('フィルタリング', () => {
        test('価格がない行はスキップされる', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>-</td><td>Not a product</td></tr>
                    <tr><td>N/A</td><td>Also not product</td></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(0);
        });

        test('仕様が短すぎる行はスキップされる (5文字以下)', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>¥100,000</td><td>ABC</td></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(0);
        });

        test('ノイズキーワード "submitget" を含む行はスキップされる', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>¥100,000</td><td>SubmitGet Form Handler</td></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(0);
        });

        test('ノイズキーワード "frmprodhead" を含む行はスキップされる', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>¥100,000</td><td>frmProdHead Container</td></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(0);
        });
    });

    describe('エッジケース', () => {
        test('ヘッダー行がないテーブルは空配列を返す', () => {
            document.body.innerHTML = `
                <table>
                    <tr><td>Data1</td><td>Data2</td></tr>
                    <tr><td>Data3</td><td>Data4</td></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(0);
        });

        test('1行しかないテーブルは空配列を返す', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                </table>
            `;

            expect(extractor.extract(document.body)).toHaveLength(0);
        });

        test('テーブルがない場合は空配列を返す', () => {
            document.body.innerHTML = `<div>No table here</div>`;
            expect(extractor.extract(document.body)).toHaveLength(0);
        });

        test('複数のテーブルから製品を抽出できる', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>¥80,000</td><td>Product from Table 1</td></tr>
                </table>
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr><td>¥90,000</td><td>Product from Table 2</td></tr>
                </table>
            `;

            const products = extractor.extract(document.body);
            expect(products).toHaveLength(2);
        });

        test('セル数がヘッダーより少ない行はスキップされる', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th><th>OS</th></tr>
                    <tr><td>¥100,000</td></tr>
                    <tr><td>¥150,000</td><td>Valid Product Here</td><td>Win11</td></tr>
                </table>
            `;

            const products = extractor.extract(document.body);
            expect(products).toHaveLength(1);
        });
    });

    describe('テキストクリーニング', () => {
        test('script タグの内容は除去される', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr>
                        <td>¥100,000<script>alert('x')</script></td>
                        <td>Product Name<script>console.log('y')</script></td>
                    </tr>
                </table>
            `;

            const products = extractor.extract(document.body);
            expect(products[0]?.price).not.toContain('alert');
            expect(products[0]?.specifications).not.toContain('console');
        });

        test('余分な空白は正規化される', () => {
            document.body.innerHTML = `
                <table>
                    <tr><th>価格</th><th>仕様</th></tr>
                    <tr>
                        <td>¥100,000</td>
                        <td>Product    with    extra    spaces</td>
                    </tr>
                </table>
            `;

            const products = extractor.extract(document.body);
            expect(products[0]?.specifications).toBe('Product with extra spaces');
        });
    });
});
