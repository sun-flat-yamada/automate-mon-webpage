# Webpage Monitor

This repository is for experimenting with a system that **automatically monitors multiple web pages using GitHub Actions, notifies you with screenshots if there are changes, and saves the history**.

Monitoring targets are defined in `config.json`, and GitHub Actions executes the following **every 30 minutes**:

- Fetch the page
- Extract the specified CSS selector section
- Detect changes by comparing hashes
- If there is a change, take a screenshot (Puppeteer)
- Notify via Slack / LINE / Discord (only if configured)
- Save history (HTML, screenshot, meta information) in `history/`
- Update `last_hash.txt` for each site

---

## 📁 Directory Structure

```txt
/
├── .github/
│   └── workflows/
│       └── mon-webpage.yml   # GitHub Actions workflow
├── config.json                # Monitoring target configuration
├── history/                   # History for each site
     └── <TARGET_NAME>/
         ├── last_hash.txt
         └── 2026-01-08-2130/
               ├── section.png
               ├── section.html
               └── meta.txt
```

---

## ⚙️ Monitoring Configuration (config.json)

Monitoring targets are defined in `config.json`.

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

To monitor multiple sites, simply add them to the array.

---

## 🔔 Notifications

Slack, LINE, and Discord notifications are **only executed if they are set in GitHub Secrets**.

If they are not set, they will be automatically skipped.

---

## 🧩 How to Set Up GitHub Secrets

### 1. Slack Webhook URL (Optional)

Create a Slack Incoming Webhook and register it in GitHub Secrets with the following name:

```txt
SLACK_WEBHOOK_URL
```

---

### 2. Discord Webhook URL (Optional)

Create a Discord Webhook and register it in GitHub Secrets with the following name:

```txt
DISCORD_WEBHOOK_URL
```

---

## 📱 Registering LINE Messaging API Tokens (Details)

Steps to register the Channel Access Token and Bot User ID in GitHub Secrets to send notifications using the LINE Messaging API.

---

### 1. Access the LINE Developers Console

Open the following URL:

[https://developers.line.biz/en/](https://developers.line.biz/en/)

Log in with your LINE Business account.

---

### 2. Create a Channel (or Use an Existing One)

1. Open the **Developers Console**
2. Click **Create a new channel**
3. **Channel type**: Select Messaging API
4. Enter the required information and create it

---

### 3. Get the Channel Access Token

1. Open the settings page for the created channel
2. Open the **Messaging API** tab
3. Click the **Issue** button for "Channel access token"
4. Copy the displayed token

⚠️ **It will only be displayed on this screen once. Make sure to copy it.**

---

### 4. Get the Bot User ID

There are several ways to get the Bot User ID:

#### Method A: Get from LINE Official Account Manager

1. Access **LINE Official Account Manager**:  
   [https://manager.line.biz/](https://manager.line.biz/)
2. Select the account
3. Check the Bot User ID in **Settings** → **Basic Settings**

#### Method B: Get from Webhook Events

1. Send a message to the bot
2. Check `sourceUserId` in the logs when the workflow runs
3. Use that value as the User ID

---

### 5. Register in GitHub Secrets

On your GitHub repository page:

1. Open **Settings**
2. From the left menu, select **Secrets and variables → Actions**
3. Click **New repository secret**
4. Register the following two:

```txt
Name: LINE_MESSAGING_API_TOKEN
Value: <Channel Access Token>
```

```txt
Name: LINE_BOT_USER_ID
Value: <Bot User ID>
```

Save and you're done.

---

## 🚀 GitHub Actions Operation

`.github/workflows/mon-webpage.yml` runs every 30 minutes.

For each target:

1. Fetch page
2. Extract specified selector
3. Compare hash
4. If changed:
   - Take screenshot
   - Save history
   - Notify Slack / LINE / Discord
5. Update `last_hash.txt`
6. Finally, commit changes together

---

## 📸 History Example

```txt
history/dell_inventory/2026-01-08-2130/
├── section.png
├── section.html
└── meta.txt
```

`meta.txt` records the following:

```txt
Detected at: 2026-01-08 21:30:00
URL: https://jpstore.dell.com/...
Selector: #inventoryTable
Hash: 1234567890abcdef...
```

---

## 🧪 How to Test Locally

Node.js is required to use Puppeteer.

```bash
npm install
node scripts/screenshot.js
```
