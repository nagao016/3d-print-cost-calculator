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

## テスト状況（2026-10-16 Preview検証）
- GitHub Actions Run #26（commit `d1305f46123f1f0959da7f45215461a0716078ce`）成功: API回帰テスト21件（21 passed / 0 failed）。Playwrightブラウザテスト9件をChromium・Firefox・WebKitの各エンジンで実行し、合計27実行がすべて成功。実行ログ: https://github.com/nagao016/3d-print-cost-calculator/actions/runs/38843340161
- ブラウザテストでは、基本計算の再計算、ステップ遷移、Pro機能表示、無料会員ロック、CSVダウンロード、商品行追加、保存条件の保存/呼び出し、フィラメント10種類上限、320/375/390/768pxの水平はみ出し、資格確認APIの一時ネットワーク障害時のトークン保持、localStorage消去後にPro権限を付与しないことを確認。
- API回帰テスト21件には、署名不正/期限切れ、重複・順不同イベント、解約と支払い失敗による資格失効、active状態維持、Stripe API一時障害時の再試行、Checkoutトークン照合、Origin検証、Billing Portal入力検証が含まれる。
- Cloudflare Pages Preview: `PRO_ACCESS` が `pro-access-preview` namespaceに接続されていること、Previewの `SITE_URL` とテストPrice IDが設定されていることを読み取り確認。Secret値はCloudflare APIから読み戻せないため、値そのものは検証していない。
- Stripe Test mode: アプリ経由のCheckout購入成功、購入完了画面への復帰、KVライセンス `active`、Billing Portal表示を確認。
- 解約E2E: 専用のテスト契約の解約後に対応するKVライセンスが `inactive` になることを確認。
- 更新失敗E2E: 専用契約で500円の更新請求を失敗させ、`invoice.payment_failed`、Webhook HTTP 200 / `received: true`、KVのイベント処理済みキー、およびアプリ発行ライセンスの `active` から `inactive` への変更を確認。
- Webhook購読設定: `checkout.session.completed`、`customer.subscription.created`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.payment_failed` の5イベントを確認。
- Chromium・Firefox・WebKitでのPlaywrightテストは成功。ただし、実機iOS/Androidや物理端末のSafariは実機テストしていないため、端末固有の挙動を保証するものではない。
- 本番公開前の残作業: 実機iOS/Androidでの操作確認、Production適用前の最終レビュー。
- この作業でPRをマージしたり、Productionを変更したり、Stripe Live課金を有効化したりしていない。
## 運用上の注意
- Stripe側の購入者情報処理と、自社側で情報を保存しないことは別の問題である。プライバシー告知にはStripeで処理される情報と、自社KVに保存するライセンス状態・Stripe IDを明記する。
- ブラウザ内の状態だけを信頼せず、Pro権限確認APIと連携させる。
- StripeやCloudflareの料金・無料枠・規約は変更される可能性があるため、公開前に公式の最新情報を確認する。
