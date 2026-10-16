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
- `SITE_URL` = `https://feat-privacy-first-subscript.3d-print-cost-calculator-7ce.pages.dev` (Preview専用。末尾の `/` は付けない)
- `STRIPE_SECRET_KEY` = Stripeのテスト Secret key（Secretとして登録）
- `STRIPE_PRICE_ID` = テスト Price ID
- `STRIPE_WEBHOOK_SECRET` = Stripe Webhookのテスト signing secret（次の手順後に登録）

秘密鍵をGitHub、HTML、JavaScript、チャット、公開ドキュメントへ貼らないでください。

## 4. Stripe Webhook
Stripe Dashboardのサンドボックス → Developers → Webhooks → Add destination / endpoint:
- Endpoint URL: `https://feat-privacy-first-subscript.3d-print-cost-calculator-7ce.pages.dev/api/stripe-webhook` (Preview専用。PreviewデプロイURLが変わった場合は実際のURLに更新してください)。
- 本番URL `https://3d-print-cost-calculator-7ce.pages.dev/api/stripe-webhook` はテスト用Webhookに登録しないでください。本番公開時はLive mode専用のWebhookとSecrets/KVを別途設定してください。
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- この実装では、会員資格の更新は主にサブスクリプションイベントで処理します。初期テストでは上記5イベントのみを選択してください。
- 表示された signing secret（`whsec_...`）を `STRIPE_WEBHOOK_SECRET` に登録する。
- 設定変更後に Pages を再デプロイする。

## 5. 現状の実装ステータス
- APIとフロントエンドの実装はPR #12の開発ブランチにあります。本番の `main` には未反映です。
- フロントエンドにはPro購入ボタン、Checkoutへの遷移、決済完了後の資格確認、ブラウザ内のライセンストークン保存、Pro機能のロック、契約管理ポータルへのリンクがあります。
- APIにはCheckout作成、購入完了確認、Pro資格確認、Stripe Billing Portalセッション作成、Webhookによる契約状態更新があります。
- 計算条件はブラウザ内の `localStorage` に保存されます。条件データ自体をサーバーへ同期する機能はありません。
- 実装が存在することと、全ケースで動作確認済みであることは別です。本番公開前に、PC/スマホでの購入・復帰・契約管理、解約、支払い失敗、Webhook署名不正・重複・順不同、資格失効、ネットワーク障害、トークン紛失・端末変更をテストしてください。
- 一時的な資格確認APIエラーでは、ユーザーが再購入を強いられないよう、保存済みトークンを削除しない動作にしています。ただしAPIエラー中は資格を再確認できないため、復旧後に再確認が必要です。
- 現状は「完全に個人情報を扱わない」構成ではありません。Stripe側で購入者情報が扱われ、自社KVにはライセンス識別子とStripe customer/subscription IDが保存されます。プライバシー告知に明記してください。
