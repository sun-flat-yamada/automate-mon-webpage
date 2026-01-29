> [!IMPORTANT]
> 本ファイルは人間専用の参照用です。AIは本ファイルを読み込まず、必ず英語版を参照してください。
> This file is for human reference only. AI agents must NOT read this file and MUST refer to the English master version instead.

# Webpage Monitor

このリポジトリは、**GitHub Actions を使って複数の Web ページを自動監視し、変化があればスクリーンショット付きで通知し、履歴として保存する仕組み** の実験用です。

監視対象は `config.json` に定義し、
GitHub Actions が **30 分ごと**に以下を実行します。

- ページを取得
- 指定した CSS セレクタ部分を抽出
- ハッシュ比較で変化を検出
- 変化があればスクリーンショット撮影（Puppeteer）
- Slack / LINE / Discord に通知（設定されている場合のみ）
- 履歴（HTML・スクショ・メタ情報）を `history/` に保存
- `last_hash.txt` をサイトごとに更新

---

## 📁 ディレクトリ構成

```txt
/
├── .github/
│   └── workflows/
│       └── mon-webpage.yml   # GitHub Actions 本体
├── config.json                # 監視対象の設定
├── history/                   # サイトごとの履歴
     └── <TARGET_NAME>/
         ├── last_hash.txt
         └── 2026-01-08-2130/
               ├── section.png
               ├── section.html
               └── meta.txt
```

---

## ⚙️ 監視対象の設定（config.json）

監視対象は `config.json` に定義します。

```json
{
  "targets": [
    {
      "name": "dell_outlets_workstations",
      "url": "https://jpstore.dell.com/dfo/config.asp?prod=workstation&nav=all",
      "selector": "#inventoryTable"
    }
  ]
}
```

複数サイトを監視したい場合は、配列に追加するだけです。

---

## 🔔 通知について

Slack、LINE、Discord の通知は、**GitHub Secrets に設定されている場合のみ実行**されます。

設定されていない場合は自動的にスキップされます。

---

## 🧩 GitHub Secrets の設定方法

### 1. Slack Webhook URL（任意）

Slack の Incoming Webhook を作成し、
GitHub Secrets に以下の名前で登録します。

```txt
SLACK_WEBHOOK_URL
```

---

### 2. Discord Webhook URL（任意）

Discord の Webhook を作成し、
GitHub Secrets に以下の名前で登録します。

```txt
DISCORD_WEBHOOK_URL
```

---

## 📱 LINE Messaging API トークンの登録手順（詳細）

LINE Messaging API を使用して通知を送信するため、チャネルアクセストークンとボットのユーザーID を GitHub Secrets に登録する手順です。

---

### 1. LINE Developers コンソールにアクセス

以下の URL を開きます：

[https://developers.line.biz/ja/](https://developers.line.biz/ja/)

LINE ビジネスアカウントでログインします。

---

### 2. チャネルを作成（または既存のチャネルを使用）

1. **Developers Console** を開く
2. **チャネル作成** をクリック
3. **チャネルタイプ**: Messaging API を選択
4. 必要な情報を入力して作成

---

### 3. チャネルアクセストークンを取得

1. 作成したチャネルの設定ページを開く
2. **Messaging API** タブを開く
3. 「チャネルアクセストークン」の **発行** ボタンをクリック
4. 表示されたトークンをコピー

⚠️ **この画面でしか表示されません。必ずコピーしてください。**

---

### 4. ボット自身のユーザーID を取得

ボットのユーザーID を取得するには、以下の方法があります：

#### 方法A: LINE Official Account Manager から取得

1. **LINE Official Account Manager** にアクセス：
   [https://manager.line.biz/](https://manager.line.biz/)
2. アカウントを選択
3. **アカウント設定** → **基本情報** でボットのユーザーID を確認

#### 方法B: Webhook イベントから取得

1. ボットにメッセージを送信
2. ワークフロー実行時のログで `sourceUserId` を確認
3. その値をユーザーID として使用

---

### 5. GitHub Secrets に登録する

GitHub リポジトリのページで：

1. **Settings** を開く
2. 左メニューから **Secrets and variables → Actions**
3. **New repository secret** をクリック
4. 以下のように 2 つ登録：

```txt
Name: LINE_MESSAGING_API_TOKEN
Value: <チャネルアクセストークン>
```

```txt
Name: LINE_BOT_USER_ID
Value: <ボットのユーザーID>
```

保存すれば完了です。

---

## 🚀 GitHub Actions の動作

`.github/workflows/mon-webpage.yml` が 30 分ごとに実行されます。

各ターゲットについて：

1. ページ取得
2. 指定セレクタ抽出
3. ハッシュ比較
4. 変化があれば
   - スクショ撮影
   - 履歴保存
   - Slack / LINE / Discord に通知
5. `last_hash.txt` を更新
6. 最後にまとめてコミット

---

## 📸 履歴の例

```txt
history/dell_inventory/2026-01-08-2130/
├── section.png
├── section.html
└── meta.txt
```

`meta.txt` には以下が記録されます：

```txt
Detected at: 2026-01-08 21:30:00
URL: https://jpstore.dell.com/...
Selector: #inventoryTable
Hash: 1234567890abcdef...
```

---

## 🧪 ローカルでのテスト方法

Puppeteer を使うため、Node.js が必要です。

```bash
npm install
node scripts/screenshot.js
```
