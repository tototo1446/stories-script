# StoryFlow Backend API

バックエンドAPIサーバー for StoryFlow AI - Instagram Stories Analysis & Script Generation Tool

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. 環境変数の設定:
`.env.example`をコピーして`.env`を作成し、必要な値を設定してください。

```bash
cp .env.example .env
```

3. Supabaseデータベースのセットアップ:
`supabase/schema.sql`をSupabaseのSQL Editorで実行してください。

4. 開発サーバーの起動:
```bash
npm run dev
```

## 環境変数

- `PORT`: サーバーポート（デフォルト: 3001）
- `NODE_ENV`: 環境（development/production）
- `FRONTEND_URL`: フロントエンドのURL（CORS用）
- `SUPABASE_URL`: SupabaseプロジェクトURL
- `SUPABASE_KEY`: Supabase匿名キー
- `GEMINI_API_KEY`: Google Gemini APIキー
- `DIFY_API_KEY`: Dify APIキー
- `DIFY_BASE_URL`: Dify APIベースURL
- `DIFY_WORKFLOW_ID`: stories-script-generatorのワークフローID

## APIエンドポイント

### Brands
- `GET /api/brands` - ブランド情報取得
- `POST /api/brands` - ブランド情報作成
- `PUT /api/brands/:id` - ブランド情報更新

### Patterns
- `GET /api/patterns` - 保存済みパターン一覧取得
- `GET /api/patterns/:id` - 特定パターン取得
- `POST /api/patterns/analyze` - 競合パターン分析
- `DELETE /api/patterns/:id` - パターン削除

### Scripts
- `POST /api/scripts/generate` - 台本生成（Dify連携）
- `POST /api/scripts/:id/rewrite` - 台本リライト

### Growth Logs
- `GET /api/growth-logs` - 成長ログ一覧取得
- `POST /api/growth-logs` - ログ作成

## ビルド

```bash
npm run build
```

## 本番環境での起動

```bash
npm start
```
