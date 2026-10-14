# Stripe / Cloudflare テスト環境セットアップ

この手順はテストモード向けです。本番決済を有効にする前に、テストを完了してください。

## 1. Cloudflare KV
1. Cloudflare Dashboard → Workers & Pages → KV → Create namespace。
2. 名前は `pro-access-test` などにする。
3. Workers & Pages → 対象の Pages プロジェクト → Settings → Bindings → Add → KV namespace。
4. Variable name を `PRO_ACCESS`、作成した namespace を選択。
5. Preview と Production は別 namespace を使う。設定後に再デプロイ。

## 2. Stripe テスト商品
1. Stripe Dashboard で Test mode を有効にする。
2. Product を作成（例: 3D Printer Cost Calculator Pro）。
3. Recurring price を JPY 500 / month にする。
4. 作成された Price ID（`price_...`）を控える。Secret key は `sk_test_...`。
5. StripeのBilling Portal設定で、顧客がサブスクリプションを解約できるようにする。

## 3. Pages Functions 環境変数（テスト）
対象 Pages プロジェクトの Settings → Variables and Secrets で設定します。まずは **Preview / テスト環境のみ** に登録し、Productionには本番公開前まで登録しないでください。
- `SITE_URL` = `https://3d-print-cost-calculator-7ce.pages.dev`
- `STRIPE_SECRET_KEY` = Stripeのテスト Secret key（Secretとして登録）
- `STRIPE_PRICE_ID` = テスト Price ID
- `STRIPE_WEBHOOK_SECRET` = Stripe Webhookのテスト signing secret（次の手順後に登録）

秘密鍵をGitHub、HTML、JavaScript、チャット、公開ドキュメントへ貼らないでください。

## 4. Stripe Webhook
Stripe Dashboardのサンドボックス → Developers → Webhooks → Add destination / endpoint:
- Endpoint URL: **Cloudflare PagesのPreviewデプロイURL** に `/api/stripe-webhook` を付けたもの。Preview URLを確認してから登録してください。
- 本番URL `https://3d-print-cost-calculator-7ce.pages.dev/api/stripe-webhook` は、テスト完了・本番用Secrets/KV設定後まで登録しないでください。
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- この実装では、会員資格の更新は主にサブスクリプションイベントで処理します。初期テストでは上記4イベントのみを選択してください。
- 表示された signing secret（`whsec_...`）を `STRIPE_WEBHOOK_SECRET` に登録する。
- 設定変更後に Pages を再デプロイする。

## 5. 現状の実装ステータス
- APIの基盤はPR #12のブランチにあります。
- 購入・決済完了確認・Pro資格確認・契約管理ポータルのAPIを用意。
- フロントエンドの購入ボタン、購入後のライセンストークン保存、Pro機能のロック、契約管理画面へのリンクはまだ未実装。
- 本番公開前に、Webhookイベントの順序・重複、未払い・返金・解約後のアクセス、トークン紛失、端末変更を検証する必要があります。
- 現状は「完全に個人情報を扱わない」構成ではありません。Stripe側で購入者情報が扱われ、自社KVにはライセンス識別子とStripe customer/subscription IDが保存されます。プライバシー告知に明記してください。
