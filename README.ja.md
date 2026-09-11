# Automate Webpage Monitor

[English](./README.md) | [日本語](./README.ja.md)

[![CI (Build & Test)](https://github.com/sun-flat-yamada/automate-mon-webpage/actions/workflows/ci.yml/badge.svg)](https://github.com/sun-flat-yamada/automate-mon-webpage/actions/workflows/ci.yml)
[![Webpage Monitor](https://github.com/sun-flat-yamada/automate-mon-webpage/actions/workflows/mon-webpage.yml/badge.svg)](https://github.com/sun-flat-yamada/automate-mon-webpage/actions/workflows/mon-webpage.yml)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sun.flat.yamada)

**GitHub Actions** と **TypeScript** を活用した堅牢なウェブページ監視システムです。視覚的な変化やコンテンツの変更を検知し、スクリーンショットを撮影し、構造化データを抽出し、Slack, LINE, Discord に通知を送信します。

## 🚀 機能 (Features)

- **自動スケジュール実行**: GitHub Actions により30分ごとに実行されます。
- **モジュール式データ抽出**: TypeScript ベースのモジュールエンジンを使用して、製品データ（価格、仕様など）をインテリジェントに抽出します。
- **視覚的証拠**: Puppeteer を使用して、特定の要素またはページ全体のスクリーンショットを撮影します。
- **マルチチャネル通知**: JSTタイムスタンプと製品リストを含むリアルタイムアラートを Slack, LINE, Discord に送信します。
- **堅牢なエンコーディングサポート**: ブラウザ側での文字コード検出とアトミックなバイト転送により、Shift_JIS（過去データ）と UTF-8（最新データ）が混在する環境でも自動的に処理します。
- **回復力のあるデータ抽出**: テーブルヘッダーが欠損していたり文字化けしている場合でも、データ内容から列インデックス（価格、仕様）を推論するフォールバックロジックを実装しています。

## 🏗 アーキテクチャ (Architecture)

- **CI ワークフロー**: `.github/workflows/ci.yml` がビルド、テスト、コンパイル済みファイルの更新を担当します。
- **監視ワークフロー**: `.github/workflows/mon-webpage.yml` が30分ごとに実行され、変更を追跡します。
- **エンジン**: ブラウザ自動化のための Puppeteer (Chromium)。
- **ロジック**:
  - `src/main.ts`: 監視とスクリーンショットのエントリーポイント。エンコーディング破損を防ぐため、生のファイルバイト列を扱います。
  - `src/extractor.ts`: 非構造化テーブルに対するフォールバック戦略を備えた、モジュール式データ抽出エンジン。
- **インフラ**: 定期実行とデプロイのための GitHub Actions。

## 🔄 ワークフロー (Workflows)

### 1. Webpage Monitor (`mon-webpage.yml`)

- **スケジュール**: 30分ごとに実行。
- **機能**: 更新チェック、スクリーンショット撮影、データ抽出、通知送信。
- **データ分離コミット**: 結果を独立したデータ専用ブランチ（`history` ブランチ）に自動保存します。`main` ブランチにはコードのみが保持されるため、リポジトリを Fork（フォーク）した場合でも本家からの更新同期（Sync Fork）がコンフリクトなく行えます。

### 2. CI / Build & Test (`ci.yml`)

- **トリガー**: `main` ブランチへの Push または Pull Request。
- **機能**: 依存関係のインストール、`npm run build`、テストの実行。
- **自動コミット**: `dist/`（コンパイル済みJS）に変更があった場合、自動的にコミットしてリポジトリにプッシュします。これにより、手動でコンパイルしなくてもランタイムコードが常に最新に保たれます。

## 📂 プロジェクト構成

- `src/`: TypeScript ソースコード (信頼できる唯一の情報源)。
- `dist/`: コンパイル済み JavaScript (GitHub Actions から参照)。
- `tests/`: 抽出ロジックと回帰テストのためのテストスイート（`tests/fixtures/` に回帰テスト用フィクスチャを同梱）。
- `scripts/`: テストやメンテナンス用のユーティリティスクリプト。
- `history/`: 変更検知の履歴 (アーティファクト、専用の `history` ブランチで分離管理)。
- `.agent/`: エージェント用スキル・ルール（Fork 運用ナレッジ、セレクタ探索など）。
- `config.json`: 監視対象の定義。

## 🛠 開発ワークフロー

変更を行う際は、以下の手順に従ってください：

1. **依存関係のインストール**:

   ```bash
   npm install
   ```

2. **コンパイル**:

   ```bash
   npm run build
   ```

3. **テスト**:

   ```bash
   # カバレッジ付き単体テストの実行
   npm run test:coverage

   # ロジック回帰テストの実行 (履歴データが必要)
   node scripts/test-logic-regression.js

   # エンコーディング堅牢性テストの実行 (Shift_JIS/UTF-8 検証)
   npm run test:encoding

   # アーティファクト検証の実行 (main.js 実行後)
   node scripts/test-cli.js
   ```

4. **ローカル検証**:
   VS Code のデバッグ構成 "Debug: Main Script (Local Mock)" を使用するか、環境変数を設定して `node dist/main.js` を実行します。

## ⚙️ 設定 (`config.json`)

```json
{
  "targets": [
    {
      "name": "target_identifier",
      "url": "https://example.com/item",
      "selector": "#target-element",
      "extractor_type": "dell-outlet"
    }
  ]
}
```

- `extractor_type`: 抽出戦略を指定します。現在は `dell-outlet` をサポートしています。省略した場合、データ抽出 (`data.json`) はスキップされます。

---

## 🔧 GitHub セットアップ

このリポジトリを GitHub 上で設定するための手順です。

### ✅ 必須設定 (Required Settings)

リポジトリが正しく機能するためには、以下の設定が**必須**です。

#### 1. GitHub Actions の有効化

1. リポジトリの **Settings** → **Actions** → **General** を開く
2. **Actions permissions** で「Allow all actions and reusable workflows」を選択
3. 「Save」をクリック

> [!NOTE]
> 各ワークフロー（`mon-webpage.yml`, `ci.yml`）内で `permissions: contents: write` を独自に定義しているため、グローバル設定で「Read and write permissions」を有効にする必要は**ありません**。デフォルトの「Read repository contents...」のままで安全かつ十分です。

#### 2. Secrets の設定（通知用）

通知を使用するには、以下の Secrets を設定してください。設定されていないチャネルはスキップされます。

| Secret 名 | 説明 | 取得方法 |
| --- | --- | --- |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | [Slack API](https://api.slack.com/messaging/webhooks) で作成 |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL (カンマ区切りで複数指定可) | サーバー設定 → 連携サービス → ウェブフック |
| `LINE_MESSAGING_API_TOKEN` | LINE Messaging API チャネルアクセストークン | [LINE Developers](https://developers.line.biz/) で Bot を作成 |
| `LINE_BOT_USER_ID` | 通知先の LINE ユーザー ID | LINE Developers コンソールで確認 |

**手順**:

1. リポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
2. **New repository secret** をクリック
3. Name と Value を入力して保存

#### 3. CI ワークフロー設定（オプション）

CI ワークフロー (`ci.yml`) は、特別な設定を行わなくても自動的に動作します。ただし、以下の点に注意してください。

> [!WARNING]
> `main` ブランチに対して **ブランチ保護ルール**を有効にしている場合、CI ワークフローの **自動コミット機能**（コンパイル済みファイルを `main` にプッシュする機能）は失敗します（Bot が保護をバイパスできないため）。
>
> **Free/Pro プラン（個人リポジトリ）の場合:**
> GitHub の Free プランでは、Bot による保護のバイパスがサポートされていません。CI をパスさせるには以下の手順を推奨します：
>
> 1. ローカルで変更後、プッシュ前に `npm run build` を実行する。
> 2. 更新された `dist/` ディレクトリの内容を手動でコミットに含める。
> 3. プッシュする（これにより、リポジトリ上の `dist/` がすでに最新状態になるため、CI ワークフローによる自動プッシュが発生せず、エラーを回避できます）。
>
> **Enterprise/Organization プランの場合:**
> 以下の設定により、Bot によるバイパスを許可できます：
>
> 1. リポジトリの **Settings** → **Branches** → 対象ルールの **Edit** をクリック。
> 2. **"Allow specified actors to bypass required pull requests"** をチェック。
> 3. `github-actions[bot]` を検索して追加。
> 4. **Save changes** をクリック。

---

### 💡 推奨設定 (Best Practices)

安定運用のための推奨設定です。

#### ブランチ保護ルール (Branch Protection Rules)

意図しない変更を防ぐため、メインブランチを保護します。

1. **Settings** → **Branches** → **Add branch protection rule**
2. **Branch name pattern**: `main`
3. 推奨オプション:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ⬜ Do not require approvals (個人リポジトリの場合)

> [!NOTE]
> GitHub Actions Bot (`github-actions[bot]`) によるコミットは、これらのルールをバイパスして自動的にプッシュされます。

#### Dependabot の有効化

依存関係のセキュリティ更新を自動化します。

1. **Settings** → **Code security and analysis**
2. **Dependabot alerts**: Enable
3. **Dependabot security updates**: Enable

#### スケジュール実行に関する注意点

- GitHub Actions の cron スケジュールは UTC 基準です。
- `*/30 * * * *` は「30分ごと」に実行されます（注: GitHub の負荷により数分の遅延が発生する場合があります）。
- 長期間アクティビティがないリポジトリでは、スケジュール実行が自動的に無効化される場合があります。

> [!TIP]
> スケジュール実行が停止した場合は、`workflow_dispatch` 経由で手動実行することで再開できます。

---

## 🔔 通知 (Notifications)

GitHub Secrets の設定が必要です（上記の「Secrets の設定」を参照）。

各チャネルの動作:

- **Slack**: テキストメッセージ + 製品リスト
- **Discord**: 埋め込みメッセージ + スクリーンショット画像
- **LINE**: テキストメッセージ + Base64 エンコード画像 (Messaging API 使用)

---

## 🍴 Fork（フォーク）して運用する場合 (Fork Management)

本リポジトリを Fork して独自のウェブページ監視を行う場合、以下の利点と手順があります：

### 特徴
- **競合ゼロの Sync Fork**: 監視履歴データは独立した `history` ブランチに保存されるため、本家（`upstream`）の機能更新を取り込む際に Git コンフリクトが一切発生しません。
- **Zero-Config on Fork**: Fork 直後、`history` ブランチが存在しない場合でも、初回実行時にワークフローが自動的に orphan ブランチとして初期化してプッシュします。
- **クリーンな PR**: 本家に機能改善やバグ修正の Pull Request を送る際、監視データが混入しません。

### Fork 運用ナレッジ（Skills & Rules）
リポジトリ内にエージェント向けの Fork 運用ナレッジが組み込まれています：
- **Rules**: `.agent/rules/fork_management.md`（upstream と origin の区別、データ分離の原則）
- **Skills**: `.agent/skills/fork_management/SKILL.md`
- **ヘルパースクリプト**:
  ```bash
  # リモート設定とデータ分離状態の確認
  node .agent/skills/fork_management/scripts/fork-helper.js status

  # upstream からの安全な最新コード同期
  node .agent/skills/fork_management/scripts/fork-helper.js sync
  ```

Contributions are welcome! If you find this extension useful, please consider supporting its development.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sun.flat.yamada)

## 📜 ライセンス (License)

MIT
