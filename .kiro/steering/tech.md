# 技術スタック

## フロントエンドフレームワーク
- **SvelteKit**: TypeScriptベースのSPAフレームワーク
- **Milkdown**: リアルタイムプレビュー付きリッチmarkdownエディタ
- **Vite**: ビルドツールと開発サーバー

## AWSサービス
- **S3**: 静的ウェブサイトホスティングとファイルストレージ
- **Cognito**: ユーザー認証とアイデンティティ管理
- **CloudFront**: グローバルコンテンツ配信用CDN
- **Route53**: DNS管理（オプション）
- **Certificate Manager**: SSL/TLS証明書

## インフラストラクチャ
- **Terraform**: AWSリソース用Infrastructure as Code
- **Node.js 18+**: 開発環境要件

## 主要ライブラリ
- **AWS SDK v3**: ブラウザからのS3とCognito直接統合
- **DOMPurify**: markdownコンテンツのXSS保護
- **TypeScript**: アプリケーション全体の型安全性

## 開発ツール
- **pnpm**: パッケージ管理（高速で効率的なディスク使用）
- **ESLint + Prettier**: コードフォーマットとリンティング
- **Vitest**: 単体テストと統合テスト

## 共通コマンド

### 開発
```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# 本番用ビルド
pnpm build

# テスト実行
pnpm test

# 型チェック
pnpm check
```

### インフラストラクチャ
```bash
# Terraformの初期化
terraform init

# インフラストラクチャ変更の計画
terraform plan

# インフラストラクチャの適用
terraform apply

# インフラストラクチャの破棄
terraform destroy
```

## アーキテクチャ原則
- **サーバレスファースト**: バックエンドサーバー不要、クライアントサイドのみ
- **AWS直接統合**: ブラウザがAWSサービスと直接通信
- **楽観的ロック**: 同時編集のためのETagベース競合解決
- **ロールベースセキュリティ**: CognitoアイデンティティプールとS3バケットポリシー