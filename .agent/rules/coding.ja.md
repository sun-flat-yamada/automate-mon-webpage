> [!IMPORTANT]
> 本ファイルは人間専用の参照用です。AIは本ファイルを読み込まず、必ず英語版を参照してください。
> This file is for human reference only. AI agents must NOT read this file and MUST refer to the English master version instead.

# コーディング規約

## JavaScript (Node.js/Puppeteer)

- `var` の代わりに `const` と `let` を使用してください。
- すべてのPuppeteerアクションに適切なタイムアウト（デフォルト30〜60秒）を設定してください。
- ページの移動やセレクターの待機に対してエラーハンドリングを実装してください。
- ブラウザインスタンスは、`finally` ブロック内または実行の最後で必ず閉じてください。
- ロジックは `scripts/` ディレクトリに保持してください。

## JSON設定 (`config.json`)

- 有効なJSON構文を維持してください。
- ターゲットには `name`、`url`、`selector`（オプションですが推奨）が必要です。
- `name` はURLセーフ（スラッグ形式）である必要があります。

## GitHub ワークフロー

- 可能な場合はGitHub公式のアクションを使用してください。
- ワークフロー内のシェルスクリプトでは、安全のために `set -e` または `-o pipefail` を使用してください。
- 必要な環境変数とシークレットをドキュメント化してください。

## マークダウン

- ドキュメントポリシー（英語版がマスター、日本語版が `.ja.md`）に従ってください。
- GitHub Flavored Markdownを使用してください。
