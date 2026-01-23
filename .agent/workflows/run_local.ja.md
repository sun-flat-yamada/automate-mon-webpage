> [!IMPORTANT]
> 本ファイルは人間専用の参照用です。AIは本ファイルを読み込まず、必ず英語版を参照してください。
> This file is for human reference only. AI agents must NOT read this file and MUST refer to the English master version instead.

# ローカルでの動作確認

1. 依存関係がインストールされていることを確認します：
   ```bash
   npm install
   ```
2. 環境変数を設定してスクリプトを実行します。

   **Windows (PowerShell):**

   ```powershell
   $env:TARGET_URL="https://example.com"; $env:TARGET_SELECTOR="#content"; node scripts/screenshot.js
   ```

   **Linux/macOS (Bash):**

   ```bash
   export TARGET_URL="https://example.com" TARGET_SELECTOR="#content"; node scripts/screenshot.js
   ```

3. 出力を確認します：
   - カレントディレクトリに `section.png` が作成されていることを確認します。
   - コンソールログに "Screenshot saved to section.png" と表示されていることを確認します。
