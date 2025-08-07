#!/bin/bash

# Cloudflare模試検索システム デプロイスクリプト

set -e

echo "🚀 Cloudflare模試検索システムのデプロイを開始します..."

# Check if we're in the right directory
if [ ! -d "api" ] || [ ! -d "frontend" ]; then
    echo "❌ エラー: api/ および frontend/ ディレクトリが見つかりません"
    echo "プロジェクトルートディレクトリで実行してください"
    exit 1
fi

# Deploy API (Workers)
echo "📡 Workers API をデプロイしています..."
cd api

if [ ! -f "package.json" ]; then
    echo "❌ エラー: api/package.json が見つかりません"
    exit 1
fi

npm install
npx wrangler deploy

echo "✅ Workers API のデプロイが完了しました"
cd ..

# Deploy Frontend (Pages)
echo "🌐 Pages フロントエンドをデプロイしています..."
cd frontend

if [ ! -f "package.json" ]; then
    echo "❌ エラー: frontend/package.json が見つかりません"
    exit 1
fi

npm install
npm run build
npx wrangler pages deploy dist

echo "✅ Pages フロントエンドのデプロイが完了しました"
cd ..

echo ""
echo "🎉 デプロイが完了しました！"
echo ""
echo "📋 次の手順:"
echo "1. Cloudflare ダッシュボードで Workers と Pages の URL を確認"
echo "2. Google OAuth のリダイレクト URI を更新"
echo "3. フロントエンドの API_BASE_URL を本番 Workers URL に更新"
echo "4. 必要に応じて環境変数とシークレットを設定"
echo ""
echo "🔗 有用なコマンド:"
echo "  Workers ログを確認: cd api && npx wrangler tail"
echo "  Pages ログを確認: cd frontend && npx wrangler pages deployment list"
echo "  環境変数を設定: cd api && npx wrangler secret put SECRET_NAME"