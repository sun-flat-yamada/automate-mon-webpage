> [!IMPORTANT]
> 本ファイルは人間専用の参照用です。AIは本ファイルを読み込まず、必ず英語版を参照してください。
> This file is for human reference only. AI agents must NOT read this file and MUST refer to the English master version instead.

# 新規監視ターゲットの追加

1. (オプション) セレクターが不明な場合は、`Find Selector`スキルを使用して適切なCSSセレクターを特定します。
2. `config.json` を開きます。
3. `targets` 配列に以下のフィールドを持つ新しいオブジェクトを追加します：
   - `name`: サイトを一意に識別する名前（スラッグ形式、例：`google-search`）。
   - `url`: 監視対象のフルURL。
   - `selector`: キャプチャするCSSセレクター（空の場合はページ全体になりますが、セレクターの使用を推奨します）。
4. ファイルが依然として有効なJSONであることを確認します。
5. (オプション) ローカルテスト用ワークフロー (`/run_local`) を実行して、セレクターが機能することを確認します。
6. 必要に応じてドキュメント（`GEMINI.md` など）を見直し、更新します。
