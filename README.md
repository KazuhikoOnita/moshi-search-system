# 模試検索システム - Cloudflare版

医師国家試験模試の問題検索システムです。Google SheetsのデータをCloudflare Workersで検索し、Google Driveの画像を表示します。

## 構成

- **フロントエンド**: Cloudflare Pages + React + Vite + Tailwind CSS
- **バックエンド**: Cloudflare Workers + Google Workspace API連携
- **ストレージ**: Cloudflare KV (キャッシュ) + Google Sheets (データベース) + Google Drive (画像)
- **認証**: Google OAuth2 (@medicmedia.comドメイン限定)

## 🚀 クイックスタート

### 最小限での開発環境起動
```bash
# 1. リポジトリクローン
git clone <repository-url>
cd cloudflare-moshi

# 2. 環境変数設定
cd api && cp .dev.vars.template .dev.vars
cd ../frontend && cp .env.local.template .env.local

# 3. 依存関係インストール
cd ../api && npm install
cd ../frontend && npm install

# 4. 開発サーバー起動
# ターミナル1: API
cd api && npm run dev

# ターミナル2: フロントエンド  
cd frontend && npm run dev
```

## セットアップ

### 前提条件

1. Cloudflareアカウント
2. Node.js 18以上
3. Google Cloud Platform (GCP) プロジェクト
4. Google Workspace管理者権限 (OAuth設定用)
5. Wrangler CLI (`npm install -g wrangler`)

### 1. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成または既存を選択
3. APIライブラリで以下を有効化:
   - Google Sheets API
   - Google Drive API
   - Google OAuth2 API
4. 認証情報 → OAuth 2.0 クライアント ID を作成:
   - アプリケーションタイプ: ウェブアプリケーション
   - リダイレクトURI: `https://moshi-search-api.YOUR-SUBDOMAIN.workers.dev/api/auth/callback`

### 2. Cloudflare Workers (API) のデプロイ

```bash
cd api
npm install

# KV namespaceを作成
npx wrangler kv:namespace create EXAM_CACHE
npx wrangler kv:namespace create IMAGE_CACHE  
npx wrangler kv:namespace create SESSION_STORE

# wrangler.tomlのnamespace IDを更新

# 環境変数を設定
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put GOOGLE_SHEETS_ID

# デプロイ
npx wrangler deploy
```

### 3. Cloudflare Pages (フロントエンド) のデプロイ

```bash
cd frontend
npm install
npm run build

# Pagesプロジェクトを作成
npx wrangler pages create moshi-search

# デプロイ
npm run deploy
```

### 4. 環境変数の設定

#### Workers (API)

```bash
# .env.example を .dev.vars にコピー
cp .env.example .dev.vars

# .dev.vars を編集して以下の値を設定:
# - GOOGLE_CLIENT_ID: GCPコンソールから取得
# - GOOGLE_CLIENT_SECRET: GCPコンソールから取得  
# - JWT_SECRET: ランダムな文字列 (openssl rand -base64 32)
# - GOOGLE_SHEETS_ID: スプレッドシートURL内のID
# - SERVICE_ACCOUNT_EMAIL: サービスアカウントのメール (オプション)
# - SERVICE_ACCOUNT_PRIVATE_KEY: サービスアカウントの秘密鍵 (オプション)

# 本番環境へのシークレット設定
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put GOOGLE_SHEETS_ID
npx wrangler secret put SERVICE_ACCOUNT_EMAIL
npx wrangler secret put SERVICE_ACCOUNT_PRIVATE_KEY

# wrangler.toml で公開変数を設定
# ALLOWED_DOMAIN=medicmedia.com
```

#### Pages (Frontend)

`vite.config.js`で以下を更新:
```javascript
'import.meta.env.VITE_API_BASE': JSON.stringify(
  'https://moshi-search-api.YOUR-SUBDOMAIN.workers.dev'
)
```

## 開発環境

### API開発

```bash
cd api
npm run dev
# http://localhost:8787 でアクセス可能
```

### フロントエンド開発

```bash
cd frontend  
npm run dev
# http://localhost:5173 でアクセス可能
```

## 機能

### ✅ 実装済み

- Google Workspace OAuth認証
- Google Sheets からのデータ取得
- 高速キーワード検索
- 詳細フィルタ機能 (年度、科目、難易度、正答率)
- 画像プロキシ (Google Drive連携)
- レスポンシブデザイン
- KVキャッシュによるパフォーマンス最適化

### 📋 追加可能な機能

- お気に入り機能
- 検索履歴の表示
- エクスポート機能
- 統計情報表示
- 管理者機能

## パフォーマンス

- 初回検索: ~2秒
- キャッシュ利用時: ~200ms
- 画像読み込み: ~500ms (初回)、~50ms (キャッシュ時)

## 無料枠での利用

- Cloudflare Pages: 無制限
- Cloudflare Workers: 100,000リクエスト/日
- Cloudflare KV: 1GB + 100,000読み取り/日
- 想定利用量: 30人 × 100リクエスト/日 = 3,000リクエスト/日 (余裕あり)

## トラブルシューティング

### 🔥 既知の問題

#### URI malformed エラー (Vite開発サーバー)
**現象**: `viteTransformMiddleware`で`decodeURI`エラーが発生  
**原因**: APIレスポンスに含まれる`%EXAM_IMAGE_PATH%`などの不正なURL文字  
**回避策**:
```bash
# 方法1: Viteキャッシュクリア
cd frontend
rm -rf node_modules/.vite
npm run dev --force

# 方法2: 静的サーバーを使用
npm run build
python3 -m http.server 3000 --directory dist

# 方法3: 全プロセス終了後の再起動
pkill -f node
npm run dev
```

### 認証エラー

1. Google OAuth設定を確認
2. リダイレクトURIが正しく設定されているか確認
3. 会社ドメイン制限が正しく設定されているか確認
4. 開発時は認証をバイパス（`ENVIRONMENT=development`）

### データが表示されない

1. Google Drive フォルダIDが正しく設定されているか確認
2. Google Drive APIが有効化されているか確認
3. フォルダに対するアクセス権限があるか確認
4. スプレッドシートの列構成が正しいか確認

### "fail to fetch" エラー

**原因**: APIサーバーが停止している  
**解決策**:
```bash
# APIサーバー確認
curl http://localhost:8787/api/test

# 再起動
cd api && npm run dev
```

### 画像が表示されない

1. Google Drive APIが有効化されているか確認
2. 画像ファイルがDriveに存在するか確認
3. フォルダ構造が正しいか確認
4. 画像パス処理(`%EXAM_IMAGE_PATH%`)が正しく動作しているか確認

## サポート

問題が発生した場合は、以下を確認してください:

1. Cloudflare Workersのログ: `npx wrangler tail`
2. ブラウザの開発者ツール
3. Google Cloud Consoleのログ

## ライセンス

社内利用のみ