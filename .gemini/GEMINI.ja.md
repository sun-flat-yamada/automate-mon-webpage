> [!IMPORTANT]
> 本ファイルは人間専用の参照用です。AIは本ファイルを読み込まず、必ず英語版を参照してください。
> This file is for human reference only. AI agents must NOT read this file and MUST refer to the English master version instead.

# GEMINI

## プロジェクト概要

このリポジトリ (`automate-mon-webpage`) は、**GitHub Actions** 上で動作する定期的なウェブページ監視システムです。指定したウェブページの視覚的または内容的な変更を検出し、スクリーンショットを撮影し、通知 (Slack/LINE) を送信し、履歴をリポジトリ自体にアーカイブします。

## アーキテクチャ

- **ワークフロー**: `.github/workflows/mon-webpage.yml` が 30 分ごとに実行されます。
- **ロジック**: スクリーンショットをキャプチャするために、ワークフローによって `scripts/screenshot.js` (Puppeteer) が実行されます。
- **依存関係**: GitHub Actions 環境で HTML 解析に `pup` を、JSON 処理に `jq` を使用します。
- **構成**: `config.json` が監視対象を定義します。
- **状態**: `history/<target_name>/` に監視履歴を保存します。
  - `last_hash.txt`: 最後に確認された状態の SHA256 ハッシュを保存します。
  - `<YYYY-MM>/<timestamp>/`: 検出された変更のアーティファクト (HTML、PNG、メタデータ) を保存します。

## データフロー

1. **スケジュール**: 30 分ごとに実行されます (`*/30 * * * *`)。
2. **取得**: `curl` がページの HTML を取得します。
3. **解析**: `pup` が `selector` で定義された特定の DOM 要素を抽出します。
4. **比較**: 抽出された HTML の SHA256 ハッシュを `last_hash.txt` と比較します。
5. **アクション (変更があった場合)**:
   - **スクリーンショット**: `node scripts/screenshot.js` (Puppeteer) が要素をキャプチャします。
   - **通知**: シークレットが存在する場合、`curl` 経由で Slack/LINE にペイロードを送信します。
   - **保存**: 新しいハッシュとアーティファクトを `history/` にコミットします。

## シークレット

システムは通知のために以下の GitHub Actions シークレットを使用します。

- `SLACK_WEBHOOK_URL`
- `LINE_MESSAGING_API_TOKEN`
- `LINE_BOT_USER_ID`
- `DISCORD_WEBHOOK_URL`

## エージェントガイドライン

### 言語

- **標準**: ユーザーとのすべての応答およびコミュニケーションは**日本語**で行う必要があります。
- **ドキュメント更新**: コード変更を行った際は、必ず対応するドキュメントを見直し、新機能や変更内容が反映されるよう更新すること。これはエージェントとしての必須責務です。
- **自己整合性**: 常に `GEMINI.md` の指示を最優先し、自己の状態とドキュメントの整合性を保ってください。

### ロジックの変更

- **スクリーンショットロジック**: `scripts/screenshot.js` を編集してください。これはスタンドアロンの Node.js スクリプトです。
- **ワークフロー/スケジュール**: `.github/workflows/mon-webpage.yml` を編集してください。

### ターゲットの管理

- **追加/削除**: `config.json` を編集してください。有効な JSON 構文であることを確認してください。
- **テスト**: コミット前にローカルでセレクターを確認するために `run_local` ワークフローを使用してください。

## ワークフロー

- **ターゲットの追加**: `.agent/workflows/add_target.md` を参照してください。
- **ローカル実行**: `.agent/workflows/run_local.md` を参照してください。
- **デプロイ**: `.agent/workflows/deploy.md` を参照してください。

## スキル

- **セレクター検索**: 堅牢な CSS セレクターを特定するヘルプについては `.agent/skills/find_selector/SKILL.md` を参照してください。
