# Pro定期課金のプライバシー設計と公開前チェック

## 目的と前提
- Pro価格の想定は月額500円（税込）。価格設定・決済処理はこのドキュメント更新では変更しない。
- 本サイト側でカード番号、氏名、住所、電話番号、メールアドレスを会員データとして保存しないことを目指す。
- 原価計算の入力値・製品データはブラウザ内で処理し、サーバーへ送信しない。
- 決済・請求情報はStripeが処理する。
- これは「個人情報が一切処理されない」「完全匿名」を意味しない。Stripe側で購入者情報が扱われ、自社KVにも契約に紐づく識別子が保存される。

## 実装構成（PR #12の開発ブランチ）
- Cloudflare Pages Functions: Checkoutセッション作成、決済完了確認、Pro状態確認、Stripe Webhook、Billing Portalセッション作成。
- Cloudflare KV binding名: `PRO_ACCESS`。
- 環境変数: `STRIPE_SECRET_KEY`、`STRIPE_PRICE_ID`、`STRIPE_WEBHOOK_SECRET`、`SITE_URL`。
- KVに保存する情報: ランダムなライセンストークンに対応する状態、Stripe customer ID、subscription ID、契約期間終了時刻など。Stripe IDは決済契約に結びつく識別子として慎重に扱う。
- ブラウザはライセンストークンを `localStorage` に保存する。ブラウザのデータ消去や端末変更時にはトークンを復元できない場合があり、購入復元・端末移行の仕組みは別途検討が必要。
- Checkout完了画面だけでは権限を付与せず、Stripeから取得したセッション・契約状態と事前発行済みトークンを照合する。
- Webhookは署名とタイムスタンプを検証し、契約イベントについてStripeの現在状態を再取得して権限を更新する。イベント重複の抑止はKVによるベストエフォートであり、厳密な一度限りの処理を保証するものではない。

## Preview / テスト環境の設定
このPRはプレビュー検証用です。**本番の `main` へのマージ、本番公開、本番課金の有効化は、この作業では行わないでください。**

1. StripeのTest modeで月額500円の継続価格を作成し、テストPrice IDを控える。
2. Cloudflare PagesのPreview環境用にKV namespaceを用意し、binding名を `PRO_ACCESS` に設定する。Productionとは別のnamespaceを使う。
3. Preview環境にテスト用の `STRIPE_SECRET_KEY`、`STRIPE_PRICE_ID`、`STRIPE_WEBHOOK_SECRET`、`SITE_URL` を登録する。秘密値はGit、HTML、JavaScript、公開ドキュメント、チャットへ貼らない。
4. Stripe Test modeのWebhook送信先をPreview専用URLの `/api/stripe-webhook` に設定する。テストWebhookにProduction URLを登録しない。
5. Webhookイベントとして `checkout.session.completed`、`customer.subscription.created`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.payment_failed` を設定する。
6. Billing Portalをテスト環境で設定し、解約・支払い方法変更などの画面を確認する。

Preview URLや設定値は、Cloudflareの現在のPreview deployment画面で実際の値を確認してから使用する。ブランチ名が同じでも、デプロイURLが変わる可能性がある。

## テスト状況
- GitHub Actions Run #23（commit `c4d817106ffcf2280290aa89f95da09479daef56`）: API回帰テスト21件成功、ブラウザテスト5件成功（2026-10-15）。
- 自動テストはモックしたStripe APIやテスト用ブラウザ状態を使用するため、実際のStripe Test modeでの購入・Webhook配信・Billing Portal・解約・支払い失敗が成功したことを意味しない。
- 未確認: Cloudflare PreviewのKV bindingと環境変数、Stripe Test modeの実購入から権限有効化まで、Billing Portal、解約、支払い失敗のエンドツーエンド動作。
- 公開前にはPC・スマートフォン、購入完了後の復帰、解約、支払い失敗、Webhook署名不正・重複・順不同、資格失効、Stripe/ネットワーク障害、トークン紛失・端末変更を検証する。

## 運用上の注意
- Stripe側の購入者情報処理と、自社側で情報を保存しないことは別の問題である。プライバシー告知にはStripeで処理される情報と、自社KVに保存するライセンス状態・Stripe IDを明記する。
- ブラウザ内の状態だけを信頼せず、Pro権限確認APIと連携させる。
- StripeやCloudflareの料金・無料枠・規約は変更される可能性があるため、公開前に公式の最新情報を確認する。
