from pathlib import Path
from html.parser import HTMLParser
from datetime import datetime, timezone
import re

ROOT = Path(__file__).resolve().parents[1]
DRAFT_DIR = ROOT / "content-drafts"
REPORT = ROOT / "NIGHTLY-CONTENT-REPORT.md"
INDEX = ROOT / "index.html"

TOPICS = [
    ("3d-printing-cost-calculation-guide", "3Dプリンターの原価計算ガイド：費用の内訳と確認ポイント", "3Dプリンター 原価計算",
     "造形1回あたりの費用を把握したい人",
     [("原価計算で整理したい費用", "材料費、電力、作業時間、消耗品、失敗分などを整理し、実際に計算できる項目と別途見積もる項目を明確にしてください。"),
      ("材料費を見積もる", "購入単価と使用量から材料費を考える方法を、単位と計算例を確認して説明します。"),
      ("電気代・作業時間を考える", "消費電力、稼働時間、電気料金単価など、必要な前提を説明します。条件で値が変わることを明記します。"),
      ("販売価格を決める前の確認", "原価と販売価格の違い、手数料・梱包・送料・税などの扱いを説明します。"),
      ("計算ツールを使う", "実際に公開されている機能だけを紹介し、未実装機能を利用可能と書かないでください。")]),
    ("3d-printer-filament-cost", "フィラメントの材料費を計算するときの基本", "3Dプリンター フィラメント 材料費 計算",
     "造形に使うフィラメントの費用を見積もりたい人",
     [("材料費の基本式", "購入価格、スプール重量、実際の使用量など、必要な情報と単位を説明します。式や数値例は公開前に検算してください。"),
      ("スライサーの使用量を確認する", "スライサーが示す重量・長さ・推定値の意味を確認する方法を説明します。"),
      ("サポート材や失敗分を考慮する", "サポート材、ブリム、試し刷り、失敗分などの影響を説明します。"),
      ("材料費だけで価格を決めない", "電気代、作業、後処理、手数料などを別に確認する理由を説明します。"),
      ("関連ツールへの導線", "既存計算ツールで対応している範囲だけを説明し、トップページへのリンク候補を記載します。")]),
    ("3d-printing-selling-price", "3Dプリント作品の販売価格を考えるときのチェックリスト", "3Dプリント 販売価格 決め方",
     "造形物の販売価格を検討したい人",
     [("原価と販売価格の違い", "原価は費用の見積もり、販売価格は費用以外の条件も踏まえて決めることを説明します。"),
      ("費用項目を洗い出す", "材料、電力、作業、後処理、梱包、送料、プラットフォーム手数料などを検討するリストを作ります。"),
      ("利益率と利益額を区別する", "利益額と利益率の定義を混同しないように説明し、数式・例は公開前に検算します。"),
      ("需要・品質・権利を確認する", "需要、仕上がり、納期、デザインの利用権など、価格以外の重要事項を挙げます。"),
      ("価格を見直す", "材料価格や作業時間が変わった際の見直し方法を説明します。")])
]

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = []; self.in_title = False
        self.description = ""; self.h1 = []; self.in_h1 = False; self.h1buf = []
        self.ids = []; self.no_alt = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title": self.in_title = True
        if tag == "meta" and a.get("name", "").lower() == "description": self.description = a.get("content", "").strip()
        if tag == "h1": self.in_h1 = True; self.h1buf = []
        if a.get("id"): self.ids.append(a["id"])
        if tag == "img" and not a.get("alt", "").strip(): self.no_alt += 1
    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
        if tag == "h1" and self.in_h1: self.h1.append(" ".join("".join(self.h1buf).split())); self.in_h1 = False
    def handle_data(self, data):
        if self.in_title: self.title.append(data)
        if self.in_h1: self.h1buf.append(data)

def draft(topic):
    slug, title, keyword, reader, sections = topic
    out = ["> **下書き（未公開）**：ルールベースで作成した編集用のたたき台です。公開前に事実・計算式・リンク・既存機能との整合性を確認してください。",
           "", f"想定検索語：{keyword}", f"想定読者：{reader}", "", f"# {title}", "",
           "3Dプリントの費用を把握するには、材料費だけでなく、造形条件や作業内容などを整理することが大切です。このガイドでは、見積もり前に確認したい項目をまとめます。", ""]
    for h, body in sections: out += [f"## {h}", "", body, ""]
    out += ["## 計算前のチェックリスト", "",
            "- [ ] 使用材料と購入単価を確認した", "- [ ] 使用量と単位を確認した",
            "- [ ] 電力・稼働時間などの前提を確認した", "- [ ] 後処理・梱包・手数料などを確認した",
            "- [ ] 計算結果の単位と丸め方を確認した", "", "## 公開前の確認", "",
            "- [ ] 数式・数値例を検算した", "- [ ] 信頼できる情報源で事実を確認した",
            "- [ ] 実際に提供している機能だけを案内した", "- [ ] 重複コンテンツでないことを確認した",
            "- [ ] 内部リンクとスマートフォン表示を確認した", "",
            "## メタ情報案（要確認）", "", f"- Title: {title}",
            f"- Description: {title}。費用を見積もる際の確認項目と計算の考え方を整理します。", ""]
    return "\n".join(out)

def main():
    DRAFT_DIR.mkdir(parents=True, exist_ok=True)
    checks, warnings, files = [], [], []
    for t in TOPICS:
        p = DRAFT_DIR / f"{t[0]}.md"
        text = draft(t); p.write_text(text, encoding="utf-8"); files.append(p.name)
        h1 = len(re.findall(r"(?m)^# ", text)); h2 = len(re.findall(r"(?m)^## ", text))
        if h1 == 1 and h2 >= 4 and "下書き（未公開）" in text:
            checks.append(f"PASS: {p.name}: H1=1, H2={h2}, draft marker present.")
        else: warnings.append(f"Review structure: {p.name}")

    if INDEX.exists():
        parser = Parser(); parser.feed(INDEX.read_text(encoding="utf-8", errors="replace"))
        title = " ".join("".join(parser.title).split())
        if title: checks.append(f"PASS: homepage title detected: {title}")
        else: warnings.append("Homepage title not detected.")
        if parser.description: checks.append("PASS: homepage meta description detected.")
        else: warnings.append("Homepage meta description not detected.")
        if len(parser.h1) == 1: checks.append("PASS: homepage has exactly one H1.")
        else: warnings.append(f"Homepage H1 count is {len(parser.h1)}.")
        dup = sorted({x for x in parser.ids if parser.ids.count(x) > 1})
        if dup: warnings.append("Duplicate IDs: " + ", ".join(dup))
        else: checks.append("PASS: no duplicate IDs detected.")
        if parser.no_alt: warnings.append(f"{parser.no_alt} image(s) lack alt text.")
        else: checks.append("PASS: no missing image alt attributes detected.")
    else: warnings.append("index.html not found at repository root; check actual build directory.")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = ["# Nightly SEO Content Pipeline Report", "", f"- Generated: {now}",
             "- Mode: free, template-based drafts; no paid API/LLM used.",
             "- Publication: drafts only; nothing is automatically published to the live site.", "",
             "## Drafts generated", ""] + [f"- `content-drafts/{x}`" for x in files] + ["", "## Checks passed", ""]
    lines += [f"- {x}" for x in checks] or ["- None"]
    lines += ["", "## Warnings / human review required", ""]
    lines += [f"- {x}" for x in warnings] or ["- None"]
    lines += ["", "## Limitations", "",
              "- Uses fixed templates; this is not generative AI.",
              "- Does not access Google Search Console or live web sources.",
              "- Structural tests do not verify factual accuracy, originality, calculations, or rankings.",
              "- Review all drafts before publication; avoid mass-publishing thin or repetitive pages.", ""]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {len(files)} draft(s), {len(checks)} passing check(s), {len(warnings)} warning(s).")

if __name__ == "__main__": main()
