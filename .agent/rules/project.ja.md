> [!IMPORTANT]
> 本ファイルは人間専用の参照用です。AIは本ファイルを読み込まず、必ず英語版を参照してください。
> This file is for human reference only. AI agents must NOT read this file and MUST refer to the English master version instead.

# プロジェクトガイドライン

## 概要

このリポジトリ（`automate-mon-webpage`）は、GitHub Actionsで動作する定期的なウェブページ監視システムです。視覚的または内容的な変更を検出し、スクリーンショットを取得し、履歴をアーカイブします。

## アーキテクチャ

- **ワークフロー**: `.github/workflows/mon-webpage.yml`（30分ごとに実行）。
- **コアロジック**: `scripts/screenshot.js`（Puppeteerによる視覚的キャプチャ）。
- **パーサー**: GitHub Actions環境では、内容の抽出と比較のために `pup`（CLI HTMLパーサー）と `jq` が使用されます。
- **設定**: `config.json` で監視対象を定義します。
- **履歴**: `history/<target_name>/` にアーティファクトを保存します。

## ドキュメントポリシー

- **マスターファイル**: 英語のドキュメントが信頼できる唯一の情報源（Source of Truth）です。
- **日本語版**: すべてのマークダウンファイルについて、人間が参照するための `.ja.md` サフィックスを付けた日本語版が存在する必要があります。
- **エージェントの制限**: AIエージェントは英語のマスターファイルを参照しなければならず、コンテキストのために `.ja.md` ファイルを読み込んではいけません。

## 言語ポリシー

- **コミュニケーション**: ユーザーとのすべての応答および対話は **日本語** で行う必要があります。

## 安全性と完全性

- **設定のバリデーション**: `config.json` は、一意の名前を持つ有効なJSONである必要があります。
- **履歴の保持**: 明示的に要求されない限り、`history/` 内のファイルを削除しないでください。
