> [!IMPORTANT]
> 本ファイルは人間専用の参照用です。AIは本ファイルを読み込まず、必ず英語版を参照してください。
> This file is for human reference only. AI agents must NOT read this file and MUST refer to the English master version instead.

# Fork 運用ガイドライン

## 概要

本リポジトリ（`automate-mon-webpage`）がフォークされた環境において、開発および運用では **`upstream`**（本家リポジトリ）と **`origin`**（フォーク先リポジトリ）を厳格に区別する必要があります。本ドキュメントは、マージコンフリクトの防止、PR のクリーン性の維持、および永続化データの独立性を担保するためのルールを定義します。

## リモートの役割と責務

| リモート | 対象リポジトリ | 目的 | 権限 / スコープ |
| :--- | :--- | :--- | :--- |
| **`origin`** | フォーク先リポジトリ | ユーザーの作業リポジトリ、トピックブランチのプッシュ先、フォーク独自の `history` ブランチの保存先、通知用 Secrets の設定先。 | 読み取り/書き込み（完全な制御） |
| **`upstream`** | 本家リポジトリ (`sun-flat-yamada/automate-mon-webpage`) | コード、ドキュメント、ワークフロー、公式アップデートの Source of Truth。Pull Request の送信先。 | 読み取り専用（fetch / pull） |

## ブランチとデータの分離ルール

### 1. `main` ブランチは純粋なコードと設定のみを保持する
- `main` ブランチには、アプリケーションソースコード（`src/`）、コンパイル成果物（`dist/`）、テストフィクスチャ（`tests/`）、設定ファイル（`config.json`）、ワークフロー定義（`.github/`）、およびエージェント定義（`.agent/`）のみを含めます。
- 実行時の監視データ（`history/`）やローカルの一時生成物を `main` に**コミットしてはなりません**。
- フォーク先では、`main` を常に `upstream/main` と同期させておきます。フォーク先で `main` に直接コミットせず、変更は必ずトピックブランチ上で行います。

### 2. 永続化データ専用の `history` ブランチ
- すべての監視データ（`section.html`, `section.png`, `data.json`, `meta.txt`, `last_hash.txt`）は、**`history` ブランチ** にのみ永続化されます。
- `history` ブランチはリポジトリごとに完全に独立して動作します：
  - `upstream` では公式の監視履歴を記録します。
  - `origin`（フォーク先）では、本家に影響を与えることなくフォーク先独自の監視履歴を記録します。
- `history` が `main` から完全に分離されているため、フォーク先は GitHub の「Sync Fork」ボタンや `git merge --ff-only upstream/main` を使用して、**コンフリクトゼロ** でいつでも本家の最新コードを取り込むことができます。

### 3. フォークからの Pull Request ガイドライン
- 本家（`upstream`）に対して Pull Request を送信する場合：
  1. 常に最新の `upstream/main` から分岐してトピックブランチを作成します（例: `git checkout -b fix/issue-description upstream/main`）。
  2. `history/` が追跡されていないこと、およびステージングされていないことを確認します（`git status`）。
  3. すべてのテスト（`npm test`, `npm run test:encoding`, `node scripts/test-logic-regression.js`, `npm run build`）をパスすることを確認します。
  4. `upstream/main` をターゲットとして PR を送信します。**絶対に** 履歴データやフォーク固有のシークレットを PR に含めてはなりません。

### 4. フォーク先での Secrets と監視設定
- 通知用 Secrets（`SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `LINE_MESSAGING_API_TOKEN`, `LINE_BOT_USER_ID`）はリポジトリ単位のスコープです。フォーク先には本家の Secrets は引き継がれません。
- フォーク先では、Secrets が未設定の場合、各チャネルの通知は自動的にスキップされ、ワークフローが失敗することはありません。必要に応じてフォーク先（`origin`）の Settings で設定してください。
- フォーク先で独自の監視対象を設定するために `config.json` を変更する場合、専用のカスタムブランチを運用するか、upstream 同期時の `config.json` の差分に留意してください。
