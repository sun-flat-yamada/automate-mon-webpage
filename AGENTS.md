# AGENTS.md - Agent Instruction Manual

このファイルは、Google Antigravity（および同等の高度なエンジニアリングAI）がこのリポジトリで作業する際の最適化されたインストラクションです。

## 🧠 エージェントの基本マインドセット

1. **TypeScript-First & Type-Safe**: すべてのロジックは型定義から始めよ。`any` を避け、`src/` 配下の TypeScript を唯一の正典とせよ。
2. **Modular Strategy**: 抽出ロジックの変更時は `src/extractor.ts` の `BaseExtractor` を継承せよ。`scripts/screenshot.js` はレガシーであり、削除済みまたは参照のみに留めよ。
3. **Proactive Verification**: 変更後は `npm test` によるユニットテストのパスと、`npm run build` によるビルドの成功を必ず確認せよ。

## 🏗 アーキテクチャ・インバリアント（不変条件）

- **ESM Strictness**: プロジェクトは ES Modules (`"type": "module"`) である。インポート文には必ず `.js` 拡張子（TSファイルであっても）を付与せよ。
- **Config Discovery**: 新しいサイトを追加する際は、`extractor_type` フィールドを `config.json` に追加し、対応するクラスを `extractor.ts` のファクトリに登録せよ。
- **Zero-Downtime CI**: `.github/workflows/ci.yml` はビルドとテストが必須ステップとなっている。これらをスキップする変更は許容されない。このワークフローは `dist/` の自動コミットを行うが、ブランチ保護ルールによりブロックされる可能性がある点に留意せよ。
- **Encoding Invariant**: 日本語サイト（特に Shift_JIS 混在）を扱うため、ブラウザ側での文字コード検出と、Node.js 側での `iconv-lite` / `fetch` (atomic byte transfer) の併用を徹底せよ。Unicode エスケープ（例: ﾒﾓﾘ `\uff92\uff93\uff98`）の使用時は正確性を検証せよ。

## 🔄 標準開発フロー (Required Development Flow)

エージェントは変更を加える際、以下のフローを論理的順序に従って実行すること。

1. **Compilation (ビルド)**:
   - 実行コマンド: `npm run build`
   - `src/` 配下の TypeScript ファイルを `dist/` にコンパイルする。GitHub Actions は `dist/main.js` を参照するため、コード変更後は必ずビルドが必要である。
2. **Test Execution (テスト実行)**:
   - 以下の順序でテストを実行し、品質を段階的に担保する：
     - **Unit Test**: `npm test`
       - `src/extractor.ts` の独立したロジックを検証。エージェントが最も頻繁に実行すべき初動テスト。
     - **Encoding Robustness**: `npm run test:encoding`
       - Shift_JIS と UTF-8 の混在環境、および文字化け（garbled text）に対する復旧ロジックを検証。
     - **Logic Regression**: `node scripts/test-logic-regression.js`
       - 過去の HTML スナップショットを使用し、既存サイトの抽出ロジックが壊れていないか検証。
     - **Artifact Validation**: `node scripts/test-cli.js`
       - 本番実行相当の成果物（画像・JSON）が正しい形式で生成されるか最終チェック。
3. **Deploy Preparation (最終検証)**:
   - GitHub Actions 環境での動作を想定し、コンパイル後の成果物 (`dist/main.js`) をローカルで最終テストする。
   - **Local Mocking**: VS Code の `Debug: Main Script (Local Mock)` を活用し、`tests/mock_extraction.html` に対して変更が期待通り（正常に 2 件抽出、画像生成など）動作するかを決定論的に確認せよ。
   - 必要に応じて `/run_local` を使用し、本番の `TARGET_URL` に対して正しく動作するか確認。
4. **Finalization (プッシュ)**:
   - すべてのテストをパスした後、変更内容を反映したソース一式をコミット・プッシュする。
   - **注意**: `dist/` は自動ビルド成果物であるが、監視ワークフローの高度な最適化（実行時のビルド回避）のために Git 管理対象としている。
   - **GitHub Permissions**: リポジトリのグローバル設定で「Read and write permissions」を有効にする必要はない。各ワークフローが `permissions: contents: write` を定義しているため、最小権限の原則に従え。
   - **Branch Protection**: `main` ブランチに保護ルールがある場合、CI による `dist/` 自動コミットが失敗する。その場合はローカルでビルドし、手動でコミットに含めること。

## 🧠 思考と推論のガイドライン (Context Optimization)

- **Context Optimization**: 不要な `list_dir` を避け、`view_file_outline` や `grep_search` で効率的に情報を収集せよ。
- **Failure Analysis**: 過去の不具合（全画面スクショ失敗、ノイズ混入）を分析し、修正内容が十分一般化されているか自問せよ。
- **Definition of Done**: ビルド、テスト、文書更新のすべてが完了しているか確認せよ。

## 📁 重要なディレクトリ構造

- `src/`: TypeScript ソース（正典）
- `dist/`: CI/CD 用ビルド成果物（自動生成）
- `tests/`: 信頼性を担保するテストスイート
- `.agent/`: エージェント専用の専門スキルとワークフロー

---
*常に `task.md` を更新し、進捗を可視化せよ。このドキュメントを読み、理解した上で作業を開始せよ。*
