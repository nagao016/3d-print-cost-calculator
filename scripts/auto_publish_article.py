from pathlib import Path
from datetime import datetime, timezone
from html import escape
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://3dprint.calquro.online"
QUEUE_PATH = ROOT / "content-queue" / "articles.json"
STATE_PATH = ROOT / "content-queue" / "published.json"
INDEX_PATH = ROOT / "index.html"
SITEMAP_PATH = ROOT / "sitemap.xml"
REPORT_PATH = ROOT / "AUTO-PUBLISH-REPORT.md"

# Curated, template-based topics. One topic is published per scheduled run.
TOPICS = [
  {"slug":"3d-printing-electricity-cost","title":"3Dプリンターの電気代を計算する方法","description":"消費電力・印刷時間・電気料金単価から、3Dプリンターの電気代を概算する方法を解説します。","image":"/assets/article-cost.png","alt":"電卓と3Dプリント作品","caption":"電力・稼働時間・電気料金単価をそろえて試算します。","intro":"3Dプリンターの電気代は、消費電力、稼働時間、電気料金単価を使って概算できます。ただし、ヒーターの稼働状況や機種、造形条件によって実際の消費電力は変わります。","sections":[["基本的な計算式",["概算では「消費電力（kW）×稼働時間（時間）×電気料金単価（円/kWh）」で電気代を求めます。Wで表示された消費電力は、1,000で割ってkWに換算します。","例として、平均消費電力を100W、稼働時間を5時間、電気料金単価を30円/kWhと仮定すると、0.1kW×5時間×30円＝15円です。これは仮定に基づく例で、実機の実測値ではありません。"]],["消費電力の見方",["製品仕様に記載された最大消費電力は、印刷中の平均消費電力と同じとは限りません。可能であればワットチェッカーなどで実際の稼働状況を測定し、条件を記録します。"]],["原価計算に反映する",["作品ごとの電気代を求める場合は、印刷時間と消費電力の前提を明記します。材料費や機材費、失敗分なども別途確認し、同じ費用を二重計上しないようにします。"]]]},
  {"slug":"3d-printer-failure-rate-cost","title":"3Dプリントの失敗率を原価に反映する考え方","description":"造形失敗や試し刷りによる材料ロスを、原価計算にどう反映するかを整理します。","image":"/assets/article-selling-price.png","alt":"複数の色と形の3Dプリント作品","caption":"失敗分を考慮するときは、計算方法の重複に注意します。","intro":"造形失敗があると、完成品に使われた材料以外にも費用が発生します。失敗率を原価に反映する方法を決め、実績に合わせて定期的に見直すことが大切です。","sections":[["失敗率の記録",["成功した造形数と失敗した造形数、失敗時に消費した材料や時間を記録します。少数の結果だけで判断せず、一定期間の実績をもとに傾向を確認します。"]],["計算に反映する方法",["一定期間の総費用を販売可能な完成品数で割る方法や、通常の原価にロス分を加味する方法などが考えられます。採用する方法と前提を明確にしてください。"]],["二重計上を避ける",["材料使用量に失敗分を含めているのに、さらに同じロス率を上乗せすると費用を二重計上する可能性があります。計算式の各項目が何を含むかを確認します。"]]]},
  {"slug":"3d-printing-machine-depreciation","title":"3Dプリンター本体の購入費を作品ごとに考える方法","description":"プリンター本体の購入費や保守費を、作品の原価にどう配分するか考えるポイントを解説します。","image":"/assets/article-cost.png","alt":"原価を考えるための電卓と造形サンプル","caption":"機材費は使用時間や想定稼働量など、決めた基準で配分します。","intro":"プリンター本体の購入費は、作品を作るために使う機材コストの一つです。作品ごとの原価に反映する場合は、想定使用期間や稼働時間などの配分基準を決めておくと比較しやすくなります。","sections":[["配分基準を決める",["購入費を想定稼働時間で割って1時間あたりの機材費を求め、印刷時間に応じて配分する方法があります。別の基準を使う場合も、継続して比較できるように統一します。"]],["保守・消耗品も整理する",["ノズル、ビルドプレート、保守や修理などの費用は、購入費と分けて記録すると実態を把握しやすくなります。どの費用を原価に含めるかは目的に合わせて決めます。"]],["概算と会計上の扱いを区別する",["この配分は管理上の概算方法の一例です。税務・会計上の減価償却などの扱いを判断する場合は、適用されるルールを確認し、必要に応じて専門家に相談してください。"]]]},
  {"slug":"3d-printing-post-processing-cost","title":"3Dプリント作品の後処理にかかる費用を見積もる","description":"サポート除去、研磨、塗装など、造形後の作業や材料費を見積もるポイントを紹介します。","image":"/assets/article-selling-price.png","alt":"後処理前後のイメージに合う3Dプリント作品","caption":"完成までに必要な作業や材料も、必要に応じて原価に含めます。","intro":"3Dプリント作品は、造形が終わってからサポート除去、研磨、接着、塗装などの作業が必要になる場合があります。完成品を提供するまでに必要な作業と材料を整理すると、原価の見落としを減らせます。","sections":[["作業内容を分けて記録する",["作品ごとに必要な後処理を洗い出し、作業時間や使用する道具・消耗品を記録します。作品によって作業量が異なる場合は、種類ごとに分けて把握します。"]],["作業時間の扱い",["自分の作業時間を管理上の原価に含める場合は、時間単価や計上方法を決めておきます。作業時間を含めない試算は、その条件を明記します。"]],["仕上がりと価格を確認する",["後処理は見た目や耐久性に影響することがあります。必要な品質と作業負担を確認し、材料費だけで価格を決めないようにします。"]]]},
  {"slug":"3d-printing-packaging-shipping-cost","title":"3Dプリント作品の梱包費・送料を原価に含める方法","description":"梱包材や配送費を整理し、販売時に見落としやすい費用を確認する方法を解説します。","image":"/assets/article-filament.png","alt":"3Dプリント材料と造形サンプル","caption":"作品の大きさや配送方法によって梱包・送料は変わります。","intro":"販売時の収支を見積もるには、作品そのものの製造費だけでなく、梱包材や配送費も確認する必要があります。送料を購入者と出品者のどちらが負担するかによっても、手元に残る金額は変わります。","sections":[["梱包材の費用を記録する",["箱、緩衝材、袋、テープ、ラベルなど、発送1件あたりに使う資材を整理します。まとめ買いをしている場合は、購入単価と使用量から概算します。"]],["送料とサイズを確認する",["配送サービスの料金はサイズ、重量、地域、契約条件などで変わります。発送時点の公式料金と梱包後のサイズ・重量を確認してください。"]],["販売価格に反映する",["送料込み価格にするか別途請求するかを決め、販売手数料が送料にもかかるかを利用サービスの条件で確認します。送料や手数料を二重に計上しないようにします。"]]]},
  {"slug":"3d-printing-profit-margin-vs-markup","title":"利益率と原価への上乗せ率の違いを理解する","description":"売上に対する利益率と原価に対する上乗せ率の違いを、価格設定の観点から説明します。","image":"/assets/article-cost.png","alt":"価格と原価を検討する電卓","caption":"利益率と上乗せ率は分母が異なるため、同じ意味ではありません。","intro":"販売価格を考える際、「利益率」と「原価に対する上乗せ率」を混同すると、想定していた利益が得られないことがあります。何を分母にしているかを明確にして計算しましょう。","sections":[["それぞれの意味",["売上に対する利益率は、利益を売上で割って求めます。一方、原価に対する上乗せ率は、利益を原価で割って求めます。分母が異なるため、同じ利益額でも数値は変わります。"]],["数値例を確認する",["原価が100円、販売価格が150円なら、手数料などを無視した利益額は50円です。売上に対する利益率は約33.3%、原価に対する上乗せ率は50%です。実際の販売では追加費用も考慮します。"]],["手数料がある場合",["販売価格に対する手数料が発生する場合、利益の計算には手数料も含める必要があります。目標値の定義と計算式を確認してから価格を設定してください。"]]]},
  {"slug":"3d-printing-filament-color-cost","title":"フィラメントの色や素材を変えると材料費はどう変わる？","description":"フィラメントの価格や素材の違いを比較するときに確認したいポイントを整理します。","image":"/assets/article-filament.png","alt":"複数のフィラメントスプールと造形サンプル","caption":"購入価格だけでなく、使用条件や仕上がりも確認しましょう。","intro":"フィラメントは色や素材、メーカー、購入量などによって価格が異なります。単価だけでなく、印刷条件や必要な仕上がりも含めて比較すると、用途に合う材料を選びやすくなります。","sections":[["重量あたりの価格で比較する",["購入価格を使用可能な重量で割ると、1gあたりの価格を比較できます。スプール自体の重量を含めていないか、製品の表示を確認してください。"]],["印刷条件も確認する",["素材によって推奨温度、反りやすさ、保管条件などが異なる場合があります。機種との適合性やメーカーの使用条件を確認します。"]],["仕上がりとロスも考慮する",["色や素材によって後処理、サポート、試し刷りなどの条件が変わることがあります。購入単価だけでなく、作品ごとの実際の使用量や失敗分も記録して比較します。"]]]},
  {"slug":"3d-printing-print-time-estimation","title":"3Dプリントの印刷時間を原価計算に活用する","description":"スライサーの推定時間や実際の稼働時間を、費用の見積もりに活用する方法を紹介します。","image":"/assets/article-cost.png","alt":"原価計算用の電卓と3Dプリント作品","caption":"推定時間と実際の稼働時間の違いを記録すると見積もりを改善できます。","intro":"印刷時間は電気代や機材費を見積もるための重要な情報です。スライサーの推定時間と実際にかかった時間には差が出ることがあるため、記録を残して見積もりを改善しましょう。","sections":[["推定時間を確認する",["スライサーが示す時間は設定や機種に基づく推定です。開始・終了処理、材料交換、失敗による再印刷などが別途必要になる場合があります。"]],["実績を記録する",["代表的な作品について推定時間と実際の稼働時間を比較し、差が生じる条件を記録します。実績を増やすことで、次回以降の見積もりを調整しやすくなります。"]],["費用項目とつなげる",["印刷時間は電気代や機材費の試算に利用できます。ただし作業時間と機械の稼働時間は異なるため、必要に応じて別々に管理します。"]]]},
  {"slug":"3d-printing-support-material-cost","title":"サポート材やブリムを材料費に含めるには","description":"サポート材やブリムなど、作品本体以外に使うフィラメントを見積もりに反映する方法を解説します。","image":"/assets/article-filament.png","alt":"フィラメントと小さな3Dプリント作品","caption":"完成品以外に消費する材料も、目的に応じて把握します。","intro":"3Dプリントでは、完成品の本体以外にもサポート材、ブリム、パージ材などを使うことがあります。原価をできるだけ実態に近づけるには、これらが使用量に含まれているかを確認することが大切です。","sections":[["スライサーの表示を確認する",["スライサーの推定重量にサポート材やブリムなどが含まれているかを確認します。表示項目の意味はソフトウェアや設定によって異なる場合があります。"]],["使用量を単価に換算する",["フィラメントの購入価格と使用可能な重量から1gあたりの価格を求め、対象となる材料使用量を掛けて概算します。異なる素材を使う場合は、それぞれの単価で計算します。"]],["ロスの二重計上を防ぐ",["推定使用量に含まれる材料と、別途設定する失敗率やロス率の範囲を確認します。同じ消費分を重複して計上しないようにします。"]]]},
  {"slug":"3d-printing-price-review-checklist","title":"3Dプリント作品の価格を見直すタイミングと確認項目","description":"材料価格、作業時間、送料、販売手数料の変化を価格設定に反映するためのチェック項目を紹介します。","image":"/assets/article-selling-price.png","alt":"さまざまな形の3Dプリント作品","caption":"費用や販売条件が変わったときは価格の前提を確認します。","intro":"一度決めた販売価格も、材料価格や送料、販売手数料、作業時間などが変わると、想定していた収支と合わなくなることがあります。定期的に前提を確認し、必要に応じて見積もりを更新しましょう。","sections":[["費用の変化を確認する",["フィラメントの購入単価、電気料金、消耗品、梱包材、配送費などに変化がないか確認します。販売サービスの手数料や規約も公式情報で確認します。"]],["実際の作業を振り返る",["印刷時間、後処理、失敗率、梱包作業などの実績を記録し、当初の想定と差があれば計算条件を見直します。"]],["需要と提供価値も考える",["価格は費用だけでなく、品質、納期、需要、競合、デザインの利用条件などにも影響されます。原価計算の結果だけで価格を自動決定せず、条件を総合的に判断します。"]]]}
]

def write_queue():
    QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_PATH.write_text(json.dumps(TOPICS, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def load_state():
    if not STATE_PATH.exists():
        return {"published": []}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))

def render_article(t):
    url = f"{SITE}/guide/{t['slug']}/"
    sections = "".join("<section><h2>" + escape(h) + "</h2>" + "".join("<p>" + escape(p) + "</p>" for p in ps) + "</section>" for h, ps in t["sections"])
    others = [x for x in TOPICS if x["slug"] != t["slug"] and (ROOT / "guide" / x["slug"] / "index.html").exists()]
    related = "".join(f'<li><a href="/guide/{escape(x["slug"])}/">{escape(x["title"])}</a></li>' for x in others[:6])
    image_url = SITE + t["image"]
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(t["title"])}</title><meta name="description" content="{escape(t["description"], quote=True)}"><meta name="robots" content="index,follow">
<link rel="canonical" href="{escape(url, quote=True)}"><meta property="og:type" content="article"><meta property="og:title" content="{escape(t["title"], quote=True)}"><meta property="og:description" content="{escape(t["description"], quote=True)}"><meta property="og:url" content="{escape(url, quote=True)}"><meta property="og:image" content="{escape(image_url, quote=True)}"><meta property="og:image:alt" content="{escape(t["alt"], quote=True)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{escape(image_url, quote=True)}">
<style>body{{margin:0;background:#f4f7fb;color:#172033;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.85}}header{{background:#13264b;padding:18px}}header a{{color:#fff}}main{{max-width:850px;margin:28px auto;padding:0 16px}}article{{background:#fff;border:1px solid #dce2eb;border-radius:16px;padding:clamp(18px,4vw,36px)}}h1{{font-size:clamp(1.7rem,4vw,2.3rem);line-height:1.4}}h2{{margin-top:32px;padding-bottom:8px;border-bottom:1px solid #dce2eb;font-size:1.3rem}}.hero{{margin:24px 0}}.hero img{{display:block;width:100%;max-height:430px;object-fit:cover;border-radius:12px}}figcaption,.muted{{color:#657084;font-size:.9rem}}a{{color:#1559d6}}.cta{{display:inline-block;background:#1559d6;color:#fff;text-decoration:none;border-radius:9px;padding:10px 15px;font-weight:700}}footer{{max-width:850px;margin:auto;padding:18px;color:#657084;font-size:.85rem}}</style></head>
<body><header><a href="/">← 3Dプリンター原価・販売価格計算ツールへ戻る</a></header><main><article><p class="muted">3Dプリンター 原価計算ガイド</p><h1>{escape(t["title"])}</h1><p>{escape(t["intro"])}</p>
<figure class="hero"><img src="{escape(t["image"])}" alt="{escape(t["alt"], quote=True)}" width="1200" height="800" fetchpriority="high"><figcaption>{escape(t["caption"])}</figcaption></figure>
{sections}<section><h2>計算ツールで試算する</h2><p>入力条件に基づく概算を確認するには、原価・販売価格計算ツールをご利用ください。実際の費用や販売条件に応じて前提を確認してください。</p><p><a class="cta" href="/">無料の計算ツールを使う</a></p></section><section><h2>関連記事</h2><ul>{related}</ul></section><p class="muted">公開日：{datetime.now(timezone.utc).strftime('%Y年%m月%d日')}（UTC基準）</p></article></main><footer>本ページは一般的な費用見積もりの解説です。実際の条件・料金を確認してください。</footer></body></html>'''

def update_homepage(published):
    source = INDEX_PATH.read_text(encoding="utf-8")
    start, end = "<!-- AUTO-SEO-AUTOPOST-START -->", "<!-- AUTO-SEO-AUTOPOST-END -->"
    block = start + '''\n<section id="new-auto-articles" aria-labelledby="new-auto-articles-title">
  <style>
  #new-auto-articles{max-width:1180px;margin:34px auto 64px;padding:0 24px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#252722}
  #new-auto-articles .article-index-link{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:24px 28px;background:#faf9f5;border:1px solid #d7d7ce;border-radius:12px;text-decoration:none;color:inherit;transition:transform .18s,box-shadow .18s}
  #new-auto-articles .article-index-link:hover{transform:translateY(-2px);box-shadow:0 8px 22px #25272212}
  #new-auto-articles h2{font-size:clamp(20px,2.3vw,26px);margin:0 0 7px}
  #new-auto-articles p{font-size:13px;color:#72736a;margin:0}
  #new-auto-articles .index-cta{font-size:13px;font-weight:700;color:#b84b2e;white-space:nowrap}
  @media(max-width:520px){#new-auto-articles{padding:0 18px}#new-auto-articles .article-index-link{padding:19px;align-items:flex-start;flex-direction:column;gap:12px}}
  </style>
  <a class="article-index-link" href="/guide/">
    <span><h2 id="new-auto-articles-title">ガイド記事一覧</h2><p>原価計算・材料費・電気代・販売価格など、すべての記事を一覧で確認できます。</p></span>
    <span class="index-cta">記事一覧を見る →</span>
  </a>
</section>\n''' + end
    if start in source and end in source:
        source = re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: block, source, flags=re.S)
    else:
        pos = source.lower().rfind("</main>")
        if pos < 0: raise RuntimeError("Could not locate </main> in index.html")
        source = source[:pos] + block + source[pos:]
    INDEX_PATH.write_text(source, encoding="utf-8")

def update_sitemap(published):
    old = re.findall(r"<loc>\s*(.*?)\s*</loc>", SITEMAP_PATH.read_text(encoding="utf-8")) if SITEMAP_PATH.exists() else []
    old = [url for url in old if url.startswith(SITE + "/")]
    urls = [SITE + "/"] + [SITE + "/guide/" + x["slug"] + "/" for x in published]
    urls += [x for x in old if x not in urls]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join("  <url><loc>" + escape(u) + "</loc></url>\n" for u in urls) + "</urlset>\n"
    SITEMAP_PATH.write_text(xml, encoding="utf-8")

def main():
    write_queue()
    state = load_state()
    published = state.get("published", [])
    published_slugs = {x["slug"] for x in published}
    topic = next((x for x in TOPICS if x["slug"] not in published_slugs and not (ROOT / "guide" / x["slug"] / "index.html").exists()), None)
    if topic is None:
        REPORT_PATH.write_text("# 自動記事公開レポート\n\n公開キューの全記事を処理済みです。新しいトピックを追加してください。\n", encoding="utf-8")
        print("No queued article available; nothing published.")
        return
    dest = ROOT / "guide" / topic["slug"] / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    html = render_article(topic)
    assert html.lower().startswith("<!doctype html>") and html.count("<h1>") == 1
    assert 'name="description"' in html and 'property="og:image"' in html and 'name="twitter:card"' in html
    assert topic["image"] in html and "alt=" in html
    dest.write_text(html, encoding="utf-8")
    published.append({"slug": topic["slug"], "published_at": datetime.now(timezone.utc).isoformat()})
    STATE_PATH.write_text(json.dumps({"published": published}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    update_homepage(published)
    update_sitemap(published)
    REPORT_PATH.write_text("# 自動記事公開レポート\n\n- 今回の記事: `" + topic["slug"] + "`\n- タイトル: " + topic["title"] + "\n- 画像: `" + topic["image"] + "`\n- 記事HTML、ホームの新着リンク、サイトマップを更新しました。\n- 公開キューは固定テンプレート方式です。AIによる新規文章生成や外部調査は行っていません。\n- GitHub Actionsが変更をコミット・プッシュし、Cloudflare PagesがGit連携でデプロイする設定が必要です。\n", encoding="utf-8")
    print(f"Prepared article: {topic['slug']}")

if __name__ == "__main__": main()
