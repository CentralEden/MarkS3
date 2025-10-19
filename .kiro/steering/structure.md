# プロジェクト構造

## ルートディレクトリレイアウト
```
├── .kiro/                    # Kiro IDE仕様とステアリング
│   ├── specs/               # 機能仕様
│   └── steering/            # AIアシスタントガイダンスルール
├── src/                     # ソースコード（SvelteKitアプリケーション）
├── terraform/               # Infrastructure as Code
├── docs/                    # ドキュメント
├── static/                  # 静的アセット
├── tests/                   # テストファイル
└── README.md               # プロジェクトドキュメント
```

## ソースコード構成（`src/`）
```
src/
├── lib/
│   ├── components/          # Svelteコンポーネント
│   │   ├── auth/           # 認証コンポーネント
│   │   ├── editor/         # Markdownエディタコンポーネント
│   │   ├── browser/        # ページブラウザコンポーネント
│   │   ├── files/          # ファイル管理コンポーネント
│   │   └── common/         # 共有UIコンポーネント
│   ├── services/           # ビジネスロジックサービス
│   │   ├── auth.ts         # 認証サービス
│   │   ├── s3.ts           # S3ストレージサービス
│   │   ├── wiki.ts         # Wikiページサービス
│   │   └── files.ts        # ファイル管理サービス
│   ├── stores/             # 状態管理用Svelteストア
│   │   ├── auth.ts         # 認証状態
│   │   ├── config.ts       # アプリケーション設定
│   │   └── pages.ts        # ページメタデータキャッシュ
│   ├── types/              # TypeScript型定義
│   │   ├── auth.ts         # 認証型
│   │   ├── wiki.ts         # Wiki関連型
│   │   └── aws.ts          # AWSサービス型
│   └── utils/              # ユーティリティ関数
│       ├── validation.ts   # 入力検証
│       ├── security.ts     # セキュリティヘルパー
│       └── formatting.ts   # テキストフォーマットユーティリティ
├── routes/                 # SvelteKitルート
│   ├── +layout.svelte     # メインアプリケーションレイアウト
│   ├── +page.svelte       # ホームページ
│   ├── edit/              # ページ編集ルート
│   ├── browse/            # ページブラウジングルート
│   └── admin/             # 管理パネルルート
└── app.html               # HTMLテンプレート
```

## S3バケット構造
```
s3://bucket-name/
├── pages/                  # Markdownページ
│   ├── index.md           # ホームページ
│   └── folder/            # 階層構成
│       └── page.md
├── files/                  # アップロードファイル
│   ├── images/            # 画像ファイル
│   └── documents/         # その他のファイルタイプ
├── metadata/              # システムメタデータ
│   ├── pages.json         # ページインデックスとメタデータ
│   └── files.json         # ファイルインデックスとメタデータ
└── config/                # 設定ファイル
    └── wiki.json          # Wiki設定
```

## Terraform構造（`terraform/`）
```
terraform/
├── main.tf                # メインTerraform設定
├── variables.tf           # 入力変数
├── outputs.tf             # 出力値
├── modules/               # 再利用可能モジュール
│   ├── s3/               # S3バケット設定
│   ├── cognito/          # Cognito設定
│   └── cloudfront/       # CDN設定
└── environments/          # 環境固有設定
    ├── dev/
    └── prod/
```

## 命名規則

### ファイルとディレクトリ
- **コンポーネント**: PascalCase（例：`PageEditor.svelte`）
- **サービス**: camelCase（例：`authService.ts`）
- **型**: PascalCaseインターフェース（例：`WikiPage`、`UserRole`）
- **ルート**: kebab-case（例：`/page-editor`）

### コードスタイル
- **変数**: camelCase
- **定数**: UPPER_SNAKE_CASE
- **関数**: camelCase
- **クラス**: PascalCase
- **列挙型**: PascalCase

## インポート構成
```typescript
// 1. 外部ライブラリ
import { writable } from 'svelte/store'
import { S3Client } from '@aws-sdk/client-s3'

// 2. 内部サービス
import { authService } from '$lib/services/auth'

// 3. 型
import type { WikiPage, User } from '$lib/types'

// 4. 相対インポート
import './component.css'
```

## 設定ファイルの場所
- **Package.json**: ルートディレクトリ
- **Svelte設定**: ルートの`svelte.config.js`
- **TypeScript設定**: ルートの`tsconfig.json`
- **Vite設定**: ルートの`vite.config.ts`
- **環境変数**: `.env`ファイル（gitignore対象）