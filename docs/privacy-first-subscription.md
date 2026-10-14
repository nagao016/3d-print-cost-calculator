# 個人情報を極力保持しないPro定期課金の設計

## 目標
- Pro価格は月額500円（税込予定）。
- カード情報、氏名、住所、電話番号、メールアドレスを本サイトのデータベースに保存しない。
- 原価計算の入力値や製品データはブラウザ内に置き、サーバーへ送信しない。
- 課金・請求情報はStripe側で管理する。
- 自社側ではPro利用権限を確認するためのランダムなライセンストークンと状態だけをCloudflare KVに保存する。これは完全な匿名性を意味せず、決済サービス上の契約と結びつき得る識別子として扱う。

## 実装構成
- Cloudflare Pages Functions: Checkoutセッション作成、決済完了確認、Pro状態確認、Stripe Webhook、契約管理ポータル作成。
- KVにはランダムなライセンストークンに加えて、契約管理・状態同期に必要なStripe customer ID / subscription IDも保存する。これらは直接の氏名等ではないが、決済契約に紐づく識別情報として慎重に扱い、プライバシー告知に記載する。
- Cloudflare KV binding: `PRO_ACCESS`。
- 環境変数: `STRIPE_SECRET_KEY`、`STRIPE_PRICE_ID`、`STRIPE_WEBHOOK_SECRET`、`SITE_URL`。
- ブラウザはランダムなライセンストークンを localStorage に保持する。端末やブラウザを変えると引き継がれないため、購入復元の仕組みは別途検討が必要。
- Stripe Checkout / Billing の利用料金・利用条件を確認すること。Stripeの標準国内カード決済手数料は現行料金ページで確認し、月額課金の追加料金も導入時に確認する。

## 公開前に必要な設定
1. Stripeで月額500円の継続価格を作成し、Price IDを設定。
2. Cloudflare PagesにKV namespaceを作り、binding名を `PRO_ACCESS` に設定。
3. 上記4つの環境変数をCloudflare Pagesの本番・プレビュー環境に安全に登録。秘密鍵はGitへコミットしない。
4. Stripe Webhookを `/api/stripe-webhook` に設定し、subscription created/updated/deleted と checkout session completed を送信する。
5. Stripe Billing Portalを有効化し、解約や支払い方法変更の画面を確認する。
6. テストモードで購入・支払い失敗・解約・再ログイン・別端末の挙動を検証する。

## 注意点 / 未完了
- これらのAPIだけでは、フロントエンドのPro UI、購入完了後のトークン保存、Pro機能のロック、解約リンクは未実装。
- Stripe Checkoutは購入者情報をStripe側で扱う場合がある。自社が情報を保持しないことと、個人情報が一切処理されないことは別。
- Cloudflare KVとPages Functionsは無料枠の範囲で始められる可能性があるが、利用量・プラン条件は公開前に確認する。
- Webhook署名の検証にはStripeの標準的なタイムスタンプ許容幅やイベント重複処理の追加検討が必要。実運用前にレビュー・テストする。
- ブラウザ内のPro状態は利用者が改変できるため、Pro機能の保護はサーバー確認とセットで行う。クライアントだけのフラグを信用しない。
