# Webpage Monitor

このリポジトリは、**GitHub Actions を使って複数の Web ページを自動監視し、変化があればスクリーンショット付きで通知し、履歴として保存する仕組み** の実験用です。

監視対象は `config.json` に定義し、  
GitHub Actions が **30 分ごと**に以下を実行します。

- ページを取得  
- 指定した CSS セレクタ部分を抽出  
- ハッシュ比較で変化を検出  
- 変化があればスクリーンショット撮影（Puppeteer）  
- Slack / LINE Notify に通知（設定されている場合のみ）  
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

Slack と LINE Notify の通知は、**GitHub Secrets に設定されている場合のみ実行**されます。

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

## 📱 LINE Notify Token の登録手順（詳細）

LINE Notify のトークンを GitHub Secrets に登録する手順を、  
初めての人でも迷わないように丁寧にまとめています。

---

### 1. LINE Notify にアクセス

以下の URL を開きます：

https://notify-bot.line.me/ja/

右上の **ログイン** を押し、LINE アカウントでログインします。

---

### 2. マイページを開く

ログイン後、右上のメニューから **マイページ** を開きます。

---

### 3. 「アクセストークンの発行」へ進む

マイページ内にある：

- **アクセストークンの発行（開発者向け）**

をクリックします。

---

### 4. トークンを発行する

以下を設定します：

- **トークン名**：任意（例：`WebMonitor`）
- **通知を送るトークルーム**  
  - 自分だけに送りたい → 「1:1 で LINE Notify とトーク」  
  - グループに送りたい → グループに LINE Notify を招待して選択

最後に **発行する** をクリック。

---

### 5. トークンをコピーする（重要）

発行されたトークンが表示されます。

⚠️ **この画面でしか表示されません。必ずコピーしてください。**

---

### 6. GitHub Secrets に登録する

GitHub リポジトリのページで：

1. **Settings** を開く  
2. 左メニューから **Secrets and variables → Actions**  
3. **New repository secret** をクリック  
4. 以下のように登録：

```txt
Name: LINE_NOTIFY_TOKEN
Value: <コピーしたトークン>
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
   - Slack / LINE に通知  
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
node screenshot.js
```
