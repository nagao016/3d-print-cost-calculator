from pathlib import Path
from html.parser import HTMLParser
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
REPORT = ROOT / "site-check-report.md"

class PageInspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title_depth = 0
        self.title_text = []
        self.meta_description = False
        self.h1_count = 0
        self.ids = []
        self.links = []
        self.images_without_alt = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.title_depth += 1
        elif tag == "meta" and attrs.get("name", "").lower() == "description":
            self.meta_description = bool(attrs.get("content", "").strip())
        elif tag == "h1":
            self.h1_count += 1
        elif attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "img" and not attrs.get("alt", "").strip():
            self.images_without_alt += 1

    def handle_endtag(self, tag):
        if tag == "title" and self.title_depth:
            self.title_depth -= 1

    def handle_data(self, data):
        if self.title_depth:
            self.title_text.append(data.strip())

def main():
    errors, warnings, passed = [], [], []
    if not INDEX.exists():
        errors.append("Required file index.html was not found at the repository root.")
        content = ""
    else:
        content = INDEX.read_text(encoding="utf-8", errors="replace")
        parser = PageInspector()
        parser.feed(content)

        if "".join(parser.title_text).strip():
            passed.append("Page title exists.")
        else:
            warnings.append("No non-empty <title> detected; add a clear Japanese page title.")

        if parser.meta_description:
            passed.append("Meta description exists.")
        else:
            warnings.append("No non-empty meta description detected.")

        if parser.h1_count == 1:
            passed.append("Exactly one H1 heading detected.")
        elif parser.h1_count == 0:
            warnings.append("No H1 heading detected.")
        else:
            warnings.append(f"{parser.h1_count} H1 headings detected; confirm the heading hierarchy.")

        duplicates = sorted({x for x in parser.ids if parser.ids.count(x) > 1})
        if duplicates:
            warnings.append("Duplicate HTML IDs: " + ", ".join(duplicates))
        else:
            passed.append("No duplicate HTML IDs detected.")

        if parser.images_without_alt:
            warnings.append(f"{parser.images_without_alt} image(s) lack non-empty alt text.")
        else:
            passed.append("Images have alt text, or no images were detected.")

        missing_local = []
        for href in parser.links:
            href = href.strip()
            if not href or href.startswith(("#", "https://", "http://", "mailto:", "tel:", "javascript:")):
                continue
            path = href.split("#", 1)[0].split("?", 1)[0]
            if not path:
                continue
            target = (ROOT / path.lstrip("/")).resolve()
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                warnings.append(f"Link points outside repository: {href}")
                continue
            if not target.exists() and not (target / "index.html").exists():
                missing_local.append(href)
        if missing_local:
            warnings.append("Potentially missing local link targets: " + ", ".join(sorted(set(missing_local))))
        else:
            passed.append("No missing local link targets detected by the basic checker.")

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# Nightly Site Check Report",
        "",
        f"- Generated: {timestamp}",
        f"- Repository path checked: `{ROOT.name}`",
        "",
        f"## Passed ({len(passed)})",
    ]
    lines += [f"- {item}" for item in passed] or ["- None"]
    lines += ["", f"## Warnings ({len(warnings)})"]
    lines += [f"- {item}" for item in warnings] or ["- None"]
    lines += ["", f"## Errors ({len(errors)})"]
    lines += [f"- {item}" for item in errors] or ["- None"]
    lines += [
        "",
        "## Scope and limitations",
        "- This is a lightweight static HTML check, not a full browser test.",
        "- It does not measure Google rankings, traffic, conversion, or payment correctness.",
        "- Review warnings before changing production pages.",
    ]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    if errors:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
