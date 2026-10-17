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
        "image": "/assets/article-cost.png",
        "image_alt": "電卓と3Dプリント作品を並べた原価計算のイメージ",
        "image_caption": "材料費だけでなく、電気代や機材費なども整理して原価を見積もります。",
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
        "image": "/assets/article-filament.png",
        "image_alt": "フィラメントのスプールと3Dプリントの造形サンプル",
        "image_caption": "購入価格・スプール重量・作品に使う量をそろえて材料費を計算します。",
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
        "image": "/assets/article-selling-price.png",
        "image_alt": "さまざまな色と形の3Dプリント作品",
        "image_caption": "販売価格は原価だけでなく、手数料・送料・利益率なども考慮して決めます。",
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
<meta property="og:image" content="__OG_IMAGE__">
<meta property="og:image:alt" content="__IMAGE_ALT__">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="__TITLE__">
<meta name="twitter:description" content="__DESCRIPTION__">
<meta name="twitter:image" content="__OG_IMAGE__">
<link rel="canonical" href="__URL__">
<title>__TITLE__</title>
<style>
:root{color-scheme:light;--ink:#172033;--muted:#5b6577;--line:#dce2eb;--accent:#225bd6;--bg:#f4f7fb}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.8}
header{background:#13264b;color:white;padding:20px 18px}.wrap{max-width:860px;margin:auto}
header a{color:white}main{padding:26px 16px 42px}article{background:white;border:1px solid var(--line);border-radius:14px;padding:clamp(18px,4vw,34px)}
h1{font-size:clamp(1.7rem,4vw,2.3rem);line-height:1.4;margin:8px 0 14px}h2{font-size:1.35rem;margin-top:32px;padding-bottom:7px;border-bottom:1px solid var(--line)}h3{font-size:1.05rem}a{color:var(--accent)}.eyebrow{color:var(--muted);font-size:.9rem}.article-visual{margin:24px 0 30px}.article-visual img{display:block;width:100%;max-height:440px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}.article-visual figcaption{font-size:.88rem;color:var(--muted);margin-top:8px}.cta{display:inline-block;background:var(--accent);color:white;text-decoration:none;padding:11px 16px;border-radius:9px;font-weight:700}footer{padding:20px 16px 32px;color:var(--muted);font-size:.85rem}li{margin:.35rem 0}.faq{border-top:1px solid var(--line);padding:8px 0}
</style>
</head>
<body>
<header><div class="wrap"><a href="/">← 原価・販売価格計算ツールへ戻る</a></div></header>
<main class="wrap"><article>
<p class="eyebrow">3Dプリンター原価計算ガイド</p>
<h1>__TITLE__</h1>
<p>__INTRO__</p>
<figure class="article-visual"><img src="__IMAGE__" alt="__IMAGE_ALT__" width="1200" height="800" fetchpriority="high"><figcaption>__IMAGE_CAPTION__</figcaption></figure>
__SECTIONS__
__FAQ__
<section><h2>計算ツールで試算する</h2><p>入力条件に基づく原価や販売価格を確認したい場合は、無料の計算ツールをご利用ください。結果は概算であり、入力条件や含まれていない費用によって変わります。</p><p><a class="cta" href="/">原価・販売価格計算ツールを使う</a></p></section>
<section><h2>関連記事</h2><ul>__RELATED__</ul></section>
<p class="eyebrow">下書き生成日：__DATE__。公開後も内容を確認・更新してください。</p>
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
        "__OG_IMAGE__": escape(SITE + article["image"], quote=True),
        "__IMAGE__": escape(article["image"], quote=True),
        "__IMAGE_ALT__": escape(article["image_alt"], quote=True),
        "__IMAGE_CAPTION__": escape(article["image_caption"]),
        "__INTRO__": escape(article["intro"]),
        "__SECTIONS__": "".join("<section><h2>" + escape(h) + "</h2>" + "".join("<p>" + escape(p) + "</p>" for p in ps) + "</section>" for h, ps in article["sections"]),
        "__FAQ__": "<section><h2>よくある質問</h2>" + "".join("<div class=\"faq\"><h3>" + escape(q) + "</h3><p>" + escape(a) + "</p></div>" for q, a in article["faq"]) + "</section>",
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
    start = "<!-- AUTO-SEO-GUIDES-START -->"
    end = "<!-- AUTO-SEO-GUIDES-END -->"
    section = """<!-- AUTO-SEO-GUIDES-START -->
<!-- Curated guide cards removed from homepage; all articles are linked below. -->
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
    urls = [SITE + "/", SITE + "/guide/"] + [SITE + "/" + a["path"].replace("index.html", "") for a in ARTICLES]
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
        assert 'property="og:image"' in html
        assert 'name="twitter:card" content="summary_large_image"' in html
        assert 'class="article-visual"' in html
        assert article["image"] in html
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
        "- Each article includes a relevant local image, descriptive alt text, and a caption.",
        "- Open Graph and Twitter large-image metadata are included for social sharing previews.",
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
