# ストーリーズ分析＋台本作成ツール

Instagramストーリーズの分析と台本生成を支援するAIツールです。

## 機能

- **競合ベンチマーク・エンジン**: 競合のストーリーズスクショから「売れる構成パターン」を自動抽出
- **自社ブランド・ナレッジベース**: ブランド情報、ターゲット、トーンの管理
- **台本生成**: Gemini AIを使用した高品質な台本生成
- **台本リライト**: AIによる即座のリライト機能
- **成長ログ**: AI生成案とユーザー修正後の比較、修正傾向の可視化

## セットアップ

### フロントエンド

1. 依存関係のインストール:
```bash
npm install
```

2. 環境変数の設定:
`.env.local.example`をコピーして`.env.local`を作成し、バックエンドAPIのURLを設定してください。

```bash
cp .env.local.example .env.local
```

3. 開発サーバーの起動:
```bash
npm run dev
```

### バックエンド

バックエンドのセットアップについては、`backend/README.md`を参照してください。

## 技術スタック

- **フロントエンド**: React 19, TypeScript, Vite
- **バックエンド**: Node.js, Express, TypeScript
- **データベース**: Supabase (PostgreSQL)
- **AI**: Google Gemini API

## プロジェクト構造

```
├── backend/              # バックエンドAPI
│   ├── src/
│   │   ├── routes/      # APIルート
│   │   ├── services/    # ビジネスロジック
│   │   └── utils/       # ユーティリティ
│   └── supabase/        # データベーススキーマ
├── components/           # Reactコンポーネント
├── services/             # フロントエンドサービス
└── types.ts             # TypeScript型定義
```

## 開発

### フロントエンド開発

```bash
npm run dev
```

### バックエンド開発

```bash
cd backend
npm run dev
```

## ライセンス

ISC
