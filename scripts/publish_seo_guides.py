from pathlib import Path
from html import escape
from datetime import datetime, timezone
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://3d-print-cost-calculator-7ce.pages.dev"
INDEX = ROOT / "index.html"
SITEMAP = ROOT / "sitemap.xml"
REPORT = ROOT / "SEO-PUBLISH-REPORT.md"

ARTICLES = [
    {
        "path": "guide/cost-calculation/index.html",
        "slug": "cost-calculation",
        "title": "3Dプリンターの原価計算ガイド｜費用の内訳と計算方法",
        "description": "3Dプリンター作品の原価を見積もるために、材料費・電気代・機材費・失敗率・梱包費などの考え方を解説します。",
        "intro": "3Dプリント作品の原価を把握するには、フィラメント代だけでなく、電気代、機材の使用、印刷失敗、梱包や送料などを整理することが重要です。",
        "sections": [
            ("原価に含める費用", [
                "材料費は、フィラメントなどの使用量と購入単価をもとに見積もります。サポート材、パージ分、試し刷りなども必要に応じて考慮します。",
                "電気代は、印刷時間、消費電力、電気料金単価を使って概算します。実際の消費電力は機種や加熱状態によって変わります。",
                "機材費は、プリンター購入費を想定使用時間で按分する方法があります。ノズル交換や保守・修理費は別途記録すると実態に近づきます。",
                "販売する場合は、失敗分、消耗品、後処理、梱包、送料、販売手数料なども必要に応じて確認します。"
            ]),
            ("計算前に確認すること", [
                "入力値の単位をそろえ、材料重量や印刷時間が実際の造形条件に合っているか確認します。",
                "税金、人件費、固定出品料、返品・再発送などが計算に含まれていない場合は別途考慮してください。",
                "失敗率を別途反映している場合、材料ロスなどを二重に加算していないか確認します。"
            ]),
            ("計算ツールで試算する", [
                "入力条件を変更して原価や販売価格の変化を比較すると、費用の影響を把握しやすくなります。計算結果は入力条件に基づく概算として扱ってください。"
            ])
        ],
        "faq": [
            ("原価にはフィラメント代だけを含めればよいですか？", "フィラメント代は重要ですが、電気代、機材費、失敗分、消耗品、梱包・送料、販売手数料なども目的に応じて確認してください。"),
            ("計算結果は実際の利益と一致しますか？", "必ずしも一致しません。入力値の誤差や、計算に含めていない費用、値引き・返品などで結果は変わります。")
        ]
    },
    {
        "path": "guide/filament-cost/index.html",
        "slug": "filament-cost",
        "title": "3Dプリンターのフィラメント材料費の計算方法",
        "description": "フィラメントの購入価格・スプール重量・造形で使う量から材料費を見積もる方法を解説します。",
        "intro": "3Dプリント作品の材料費は、フィラメントの購入価格と作品に使う量から概算できます。実際の見積もりでは、スライサーの推定値、サポート材、パージ、失敗分なども確認しましょう。",
        "sections": [
            ("基本的な計算式", [
                "材料費の基本的な考え方は「フィラメント購入価格 ÷ 使用可能な総重量 × 作品1個の使用量」です。価格と重量の単位をそろえて計算します。",
                "例として、購入価格2,500円、総重量1,000g、使用量80gなら、材料費の概算は200円です。実際のロスなどは別途考慮します。"
            ]),
            ("使用量を確認する", [
                "スライサーが表示する材料重量や長さを確認し、造形本体・サポート材・ブリムなどの何が含まれているか把握します。",
                "購入価格と重量の対象範囲が一致していることが大切です。スプール重量の扱いは製品表示を確認してください。"
            ]),
            ("材料ロスや失敗分を考慮する", [
                "サポート材、パージ、試し刷り、造形失敗などにより、完成品以外にも材料を消費することがあります。必要なら実績を記録して見積もりに反映します。",
                "失敗率を別途原価計算に反映している場合、同じロスを二重に加算しないよう計算方法を確認します。"
            ]),
            ("材料費以外の費用", [
                "販売用の原価を求める場合は、電気代、機材費、作業時間、後処理、梱包・送料、販売手数料なども検討します。"
            ])
        ],
        "faq": [
            ("スライサーの使用量はそのまま使えますか？", "概算には使えますが、表示値に含まれる部位や実際の材料消費と一致するか確認してください。"),
            ("材料費が安ければ利益が出ますか？", "材料費だけでは判断できません。その他の製造費、販売手数料、梱包・送料なども考慮してください。")
        ]
    },
    {
        "path": "guide/selling-price/index.html",
        "slug": "selling-price",
        "title": "3Dプリント作品の販売価格の決め方｜原価と利益率",
        "description": "3Dプリント作品の販売価格を考えるために、原価・販売手数料・梱包送料・利益率などの確認ポイントを整理します。",
        "intro": "3Dプリント作品の販売価格を考えるときは、材料費だけでなく、製造にかかる費用、販売サービスの手数料、梱包・送料などを確認する必要があります。",
        "sections": [
            ("原価と販売価格の違い", [
                "原価は作品を作り販売するためにかかる費用の見積もりです。販売価格は需要、品質、納期、競合、提供価値なども考慮して決めます。",
                "材料費、電気代、機材費、消耗品、失敗分、後処理、梱包・送料など、何を原価に含めるかを決めておくと比較しやすくなります。"
            ]),
            ("販売手数料と送料を忘れない", [
                "販売サービスや決済手段によって手数料体系は異なります。割合でかかる費用と固定費を区別し、最新の公式料金を確認してください。",
                "送料を購入者が負担する場合と出品者が負担する場合では収支が変わります。梱包材や発送資材も必要に応じて計上します。"
            ]),
            ("利益額と利益率を区別する", [
                "利益額は売上から対象費用を差し引いた金額です。利益率は、どの金額を分母とするかを明確にして計算します。売上に対する利益率と原価に対する上乗せ率は異なります。",
                "販売手数料が販売価格に対する割合で発生する場合、目標利益率を満たす価格を逆算するには、手数料率と利益率の定義を確認する必要があります。"
            ]),
            ("価格を定期的に見直す", [
                "材料価格、印刷時間、失敗率、販売手数料、送料が変わったら見積もりを更新します。実際の販売結果も価格設定を見直す材料にします。",
                "販売するモデルやデザインについて、ライセンスや知的財産権上の条件を確認することも重要です。"
            ])
        ],
        "faq": [
            ("原価に利益率を足せば販売価格になりますか？", "利益率を原価に対する上乗せ率とする場合と、売上に対する利益率を目標にする場合では計算が異なります。"),
            ("販売手数料はどのように設定しますか？", "利用する販売サービスや決済サービスの公式料金を確認し、割合の手数料と固定費を分けて見積もります。")
        ]
    }
]

def render_article(article):
    sections = []
    for heading, paragraphs in article["sections"]:
        sections.append("<section><h2>" + escape(heading) + "</h2>" +
                        "".join("<p>" + escape(p) + "</p>" for p in paragraphs) + "</section>")
    faq = "<section><h2>よくある質問</h2>" + "".join(
        '<div class="faq"><h3>' + escape(q) + "</h3><p>" + escape(a) + "</p></div>"
        for q, a in article["faq"]) + "</section>"
    related = "".join(
        '<li><a href="/guide/' + other["slug"] + '/">' + escape(other["title"]) + "</a></li>"
        for other in ARTICLES if other["slug"] != article["slug"])
    return """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="__DESCRIPTION__">
<meta name="robots" content="index,follow">
<meta property="og:type" content="article">
<meta property="og:title" content="__TITLE__">
<meta property="og:description" content="__DESCRIPTION__">
<meta property="og:url" content="__URL__">
<link rel="canonical" href="__URL__">
<title>__TITLE__</title>
<style>
:root{color-scheme:light;--ink:#172033;--muted:#65718a;--line:#e0e7f2;--accent:#315ee7;--accent-dark:#183b9e;--tint:#edf2ff;--bg:#f5f7fc;--white:#fff;--shadow:0 14px 38px rgba(23,42,88,.08)}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:radial-gradient(ellipse at 10% 0%,#e8efff 0,transparent 38%),var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.85}
a{color:var(--accent);text-underline-offset:3px}a:hover{color:var(--accent-dark)}.wrap{max-width:920px;margin:auto}
header{background:linear-gradient(115deg,#101e43,#203f88 68%,#315ee7);color:white;padding:17px 20px;box-shadow:0 6px 22px #152d6020}
header .wrap{display:flex;align-items:center;gap:16px;justify-content:space-between}header a{color:white;text-decoration:none;font-weight:650}header a:hover{color:#dbe5ff}
.brand{font-weight:800;letter-spacing:.01em}.back-link{font-size:.92rem;opacity:.95}
main{padding:36px 16px 54px}article{background:var(--white);border:1px solid #e5eaf4;border-radius:22px;padding:clamp(22px,5vw,52px);box-shadow:var(--shadow);overflow:hidden}
.breadcrumb{font-size:.82rem;color:var(--muted);margin:0 0 22px}.breadcrumb a{color:var(--muted);text-decoration:none}.eyebrow{display:inline-flex;align-items:center;gap:8px;color:var(--accent-dark);background:var(--tint);border:1px solid #dce5ff;border-radius:999px;padding:5px 12px;font-size:.8rem;font-weight:750;letter-spacing:.04em;margin:0 0 14px}
h1{font-size:clamp(1.8rem,4.6vw,2.8rem);line-height:1.35;letter-spacing:-.035em;margin:0 0 20px;max-width:780px}
.lead{font-size:1.08rem;line-height:1.95;color:#3d4962;background:linear-gradient(135deg,#f2f6ff,#fbfcff);border-left:4px solid var(--accent);padding:20px 22px;border-radius:0 14px 14px 0;margin:0 0 30px}
.toc{background:#f8faff;border:1px solid var(--line);border-radius:16px;padding:22px 24px;margin:28px 0 36px}.toc h2{font-size:1rem;margin:0 0 10px;border:0;padding:0}.toc ol{padding-left:1.35rem;margin:0}.toc li{margin:5px 0}.toc a{text-decoration:none;font-weight:600}
section{margin-top:36px}h2{font-size:clamp(1.25rem,3vw,1.55rem);line-height:1.5;margin:0 0 15px;padding:0 0 12px;border-bottom:1px solid var(--line);position:relative}h2:after{content:"";display:block;position:absolute;left:0;bottom:-1px;width:54px;height:3px;border-radius:3px;background:var(--accent)}
p{margin:0 0 14px}section p:last-child{margin-bottom:0}h3{font-size:1.04rem;line-height:1.55;margin:0 0 8px}.faq{background:#fbfcff;border:1px solid var(--line);border-radius:13px;padding:18px 20px;margin:12px 0}.faq h3:before{content:"Q";display:inline-grid;place-items:center;width:25px;height:25px;background:var(--tint);color:var(--accent-dark);border-radius:7px;margin-right:9px;font-size:.8rem}
.cta-panel{margin-top:42px;padding:26px;background:linear-gradient(135deg,#14264f,#244db7);border-radius:18px;color:white}.cta-panel h2{border:0;padding:0;color:white}.cta-panel h2:after{display:none}.cta-panel p{color:#e3eaff}.cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:white;color:#173b9e;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:800;box-shadow:0 5px 16px #08183c22}.cta:hover{background:#edf2ff;color:#173b9e}
.related-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0;list-style:none}.related-grid li{margin:0}.related-grid a{display:block;height:100%;background:#fff;border:1px solid var(--line);border-radius:13px;padding:16px;text-decoration:none;font-weight:700;box-shadow:0 4px 14px #1b315308}.related-grid a:after{content:" ↗";color:var(--accent)}.date-note{font-size:.82rem;color:var(--muted);margin-top:30px;padding-top:18px;border-top:1px solid var(--line)}
footer{padding:24px 16px 38px;color:var(--muted);font-size:.84rem;text-align:center}
@media(max-width:620px){header .wrap{align-items:flex-start;flex-direction:column;gap:5px}main{padding:20px 12px 32px}article{border-radius:16px;padding:22px 18px}.lead{font-size:1rem;padding:16px}.toc{padding:18px}.related-grid{grid-template-columns:1fr}.cta{width:100%}}
</style>
</head>
<body>
<header><div class="wrap"><a href="/">← 原価・販売価格計算ツールへ戻る</a></div></header>
<main class="wrap"><article>
<p class="breadcrumb"><a href="/">ホーム</a>　›　<a href="/#seo-guides">原価計算ガイド</a>　›　この記事</p>
<p class="eyebrow">3D PRINT COST GUIDE</p>
<h1>__TITLE__</h1>
<p class="lead">__INTRO__</p>
__TOC__
__SECTIONS__
__FAQ__
<section class="cta-panel"><h2>実際の条件で原価を計算する</h2><p>材料費・電気代・機材費などを入力して、作品1個あたりの費用を試算できます。</p><p><a class="cta" href="/">無料の原価計算ツールを使う →</a></p></section>
<section><h2>関連記事</h2><ul class="related-grid">__RELATED__</ul></section>
<p class="date-note">記事の更新日：__DATE__　｜　計算結果は入力条件に基づく概算です。</p>
</article></main>
<footer class="wrap">本ページは一般的な計算方法の説明です。実際の費用・料金・販売条件を確認し、ご自身の条件で検証してください。</footer>
</body></html>
"""

def build_html(article):
    html = render_article(article)
    values = {
        "__DESCRIPTION__": escape(article["description"], quote=True),
        "__TITLE__": escape(article["title"], quote=True),
        "__URL__": escape(SITE + "/" + article["path"].replace("index.html", ""), quote=True),
        "__INTRO__": escape(article["intro"]),
        "__SECTIONS__": "".join('<section id="section-' + str(i) + '"><h2>' + escape(h) + "</h2>" + "".join("<p>" + escape(p) + "</p>" for p in ps) + "</section>" for i, (h, ps) in enumerate(article["sections"], 1)),
        "__TOC__": '<nav class="toc" aria-label="この記事の目次"><h2>この記事でわかること</h2><ol>' + "".join('<li><a href="#section-' + str(i) + '">' + escape(h) + '</a></li>' for i, (h, ps) in enumerate(article["sections"], 1)) + '<li><a href="#faq">よくある質問</a></li></ol></nav>', 
        "__FAQ__": '<section id="faq"><h2>よくある質問</h2>' + "".join("<div class=\"faq\"><h3>" + escape(q) + "</h3><p>" + escape(a) + "</p></div>" for q, a in article["faq"]) + "</section>",
        "__RELATED__": "".join("<li><a href=\"/guide/" + other["slug"] + "/\">" + escape(other["title"]) + "</a></li>" for other in ARTICLES if other["slug"] != article["slug"]),
        "__DATE__": datetime.now(timezone.utc).strftime("%Y年%m月%d日")
    }
    for key, value in values.items():
        html = html.replace(key, value)
    return html

def update_homepage():
    if not INDEX.exists():
        raise FileNotFoundError("index.html not found at repository root; refusing to modify unknown site structure.")
    source = INDEX.read_text(encoding="utf-8")
    design_marker = "AUTO-GUIDES-DESIGN-CSS"
    if design_marker not in source:
        design_css = """<style id="AUTO-GUIDES-DESIGN-CSS">
.auto-guides{margin:34px 0 8px;padding:clamp(22px,4vw,38px);border:1px solid #dce5f5;border-radius:22px;background:linear-gradient(135deg,#f4f7ff 0%,#fff 72%);box-shadow:0 12px 34px rgba(28,54,110,.07)}
.auto-guides__eyebrow{font-size:.75rem;letter-spacing:.16em;font-weight:800;color:#315ee7;margin-bottom:10px}
.auto-guides__heading{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:22px}
.auto-guides__heading h2{margin:0 0 8px;font-size:clamp(1.25rem,3vw,1.7rem);line-height:1.4;color:#172033}
.auto-guides__heading p{margin:0;color:#65718a;line-height:1.7}
.auto-guides__count{white-space:nowrap;font-size:.7rem;font-weight:800;letter-spacing:.08em;color:#52668e;border:1px solid #dce5f5;border-radius:999px;padding:7px 10px;background:#fff}
.auto-guides__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.auto-guide-card{display:flex;flex-direction:column;min-height:220px;padding:20px 18px;border:1px solid #e0e7f2;border-radius:16px;background:#fff;color:#172033;text-decoration:none;box-shadow:0 4px 14px rgba(23,42,88,.04);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.auto-guide-card:hover{transform:translateY(-3px);border-color:#b9caff;box-shadow:0 12px 24px rgba(35,75,170,.1);color:#172033}
.auto-guide-card__num{font-size:.7rem;letter-spacing:.1em;color:#315ee7;font-weight:850;margin-bottom:14px}
.auto-guide-card__title{font-size:1.04rem;line-height:1.5;font-weight:800;margin-bottom:10px}
.auto-guide-card__desc{font-size:.87rem;line-height:1.7;color:#65718a}
.auto-guide-card__link{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:17px;font-size:.84rem;color:#315ee7;font-weight:800}
.auto-guide-card__link b{font-size:1.05rem}
@media(max-width:760px){.auto-guides__grid{grid-template-columns:1fr}.auto-guide-card{min-height:0}.auto-guides__heading{align-items:flex-start;flex-direction:column}.auto-guides__count{display:none}}
</style>
"""
        head_end = source.lower().find("</head>")
        if head_end < 0:
            raise ValueError("Could not find </head>; refusing to inject guide styling.")
        source = source[:head_end] + design_css + source[head_end:]
    start = "<!-- AUTO-SEO-GUIDES-START -->"
    end = "<!-- AUTO-SEO-GUIDES-END -->"
    section = """<!-- AUTO-SEO-GUIDES-START -->
<section class="auto-guides" id="seo-guides" aria-labelledby="seo-guides-title">
  <div class="auto-guides__eyebrow">LEARN &amp; CALCULATE</div>
  <div class="auto-guides__heading">
    <div><h2 id="seo-guides-title">3Dプリンター原価計算ガイド</h2>
    <p>原価の考え方から販売価格の決め方まで、知りたいテーマから学べます。</p></div>
    <span class="auto-guides__count">GUIDE 01—03</span>
  </div>
  <div class="auto-guides__grid">
    <a class="auto-guide-card" href="/guide/cost-calculation/"><span class="auto-guide-card__num">01 / COST</span><span class="auto-guide-card__title">3Dプリンターの原価計算ガイド</span><span class="auto-guide-card__desc">材料費・電気代・機材費など、原価の内訳と計算前の確認ポイント。</span><span class="auto-guide-card__link">計算方法を読む <b>↗</b></span></a>
    <a class="auto-guide-card" href="/guide/filament-cost/"><span class="auto-guide-card__num">02 / MATERIAL</span><span class="auto-guide-card__title">フィラメント材料費の計算方法</span><span class="auto-guide-card__desc">購入価格と使用量から、造形1個あたりの材料費を見積もる方法。</span><span class="auto-guide-card__link">計算方法を読む <b>↗</b></span></a>
    <a class="auto-guide-card" href="/guide/selling-price/"><span class="auto-guide-card__num">03 / PRICE</span><span class="auto-guide-card__title">3Dプリント作品の販売価格</span><span class="auto-guide-card__desc">原価・販売手数料・送料・利益率を整理して価格を考える。</span><span class="auto-guide-card__link">価格の考え方を読む <b>↗</b></span></a>
  </div>
</section>
<!-- AUTO-SEO-GUIDES-END -->
"""
    if start in source and end in source:
        source = re.sub(re.escape(start) + r".*?" + re.escape(end), section.strip(), source, flags=re.S)
    else:
        pos = source.lower().rfind("</main>")
        if pos < 0:
            raise ValueError("Could not find </main>; refusing to inject homepage links.")
        source = source[:pos] + section + source[pos:]
    INDEX.write_text(source, encoding="utf-8")

def update_sitemap():
    old_urls = []
    if SITEMAP.exists():
        old_urls = re.findall(r"<loc>\s*(.*?)\s*</loc>", SITEMAP.read_text(encoding="utf-8"), flags=re.S)
    urls = [SITE + "/"] + [SITE + "/" + a["path"].replace("index.html", "") for a in ARTICLES]
    urls += [u.strip() for u in old_urls if u.strip() and u.strip() not in urls]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for url in urls:
        xml += "  <url><loc>" + escape(url) + "</loc></url>\n"
    xml += "</urlset>\n"
    SITEMAP.write_text(xml, encoding="utf-8")

def main():
    generated = []
    for article in ARTICLES:
        path = ROOT / article["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        html = build_html(article)
        assert html.lower().startswith("<!doctype html>")
        assert html.count("<h1>") == 1
        assert 'rel="canonical"' in html
        assert 'name="description"' in html
        assert "</html>" in html.lower()
        path.write_text(html, encoding="utf-8")
        generated.append(str(path.relative_to(ROOT)))
    update_homepage()
    update_sitemap()
    report = [
        "# SEO Guide Publication Report", "",
        "- Generated at: " + datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "- Result: generated and structurally checked 3 HTML pages.",
        "- Publication to the public website depends on Cloudflare Pages being connected to this GitHub repository and deploying the branch that receives the commit.",
        "", "## Pages", ""
    ] + ["- `" + p + "`" for p in generated] + [
        "", "## Checks", "",
        "- Each page has a title, meta description, canonical URL, one H1, and a link to the calculator.",
        "- Homepage guide links are inserted without duplicating the section on repeated runs.",
        "- Sitemap contains the three guide URLs.",
        "", "## Limitations", "",
        "- Content is generated from fixed templates, not an AI model or live keyword research.",
        "- This script does not verify live HTTP status or Cloudflare deployment success.",
        "- Review factual accuracy and suitability; SEO results are not guaranteed.",
        "- If the public domain changes, update SITE in this script."
    ]
    REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")
    print("Generated and checked 3 guide pages, homepage links, sitemap, and report.")

if __name__ == "__main__":
    main()
