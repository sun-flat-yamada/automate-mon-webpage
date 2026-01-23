> [!IMPORTANT]
> 本ファイルは人間専用の参照用です。AIは本ファイルを読み込まず、必ず英語版を参照してください。
> This file is for human reference only. AI agents must NOT read this file and MUST refer to the English master version instead.

# GitHubへのデプロイ

1. ステージング、コミット、およびプッシュ：
   ```bash
   git add .
   git commit -m "Update configuration and logic"
   git push origin main
   ```

> [!NOTE]
> GitHub Actionsのワークフロー `mon-webpage.yml` はスケジュール（30分ごと）に従って自動的に実行されます。コードをプッシュしても、手動でトリガーするかスケジュールを待たない限り、すぐには実行されません。
