from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
production = (root / "index.html").read_text(encoding="utf-8")
v3 = (root / "uiux-prototype" / "src" / "main.jsx").read_text(encoding="utf-8")
css = (root / "uiux-prototype" / "src" / "styles.css").read_text(encoding="utf-8")
preview = (root / "preview-v3.html").read_text(encoding="utf-8")
hub = (root / "guide" / "index.html").read_text(encoding="utf-8")

expected_ids = [
    "filamentPrice", "spoolWeight", "usedGrams", "printHours",
    "powerWatts", "electricityRate", "printerPrice", "printerLifeHours",
    "failureRate", "otherCost", "packagingCost", "shippingCost",
    "feeRate", "targetMargin",
]
prod_ids_match = re.search(r"const ids\\s*=\\s*\\[([^\\]]+)\\]", production)
assert prod_ids_match, "Could not locate production calculator input IDs"
prod_ids = re.findall(r'"([^"]+)"', prod_ids_match.group(1))
v3_ids = re.findall(r'\\bid:\\s*"([^"]+)"', re.search(r"const fields\\s*=\\s*\\[([\\s\\S]*?)\\n\\];", v3).group(1))
assert prod_ids == expected_ids, f"Production input IDs changed: {prod_ids}"
assert v3_ids == expected_ids, f"V3 input IDs differ from production: {v3_ids}"

# Verify that the two implementations retain the same core calculation equations.
equations = [
    ("filament", r"num\\(\\\"filamentPrice\\\"\\)\\s*/\\s*spool\\s*\\*\\s*num\\(\\\"usedGrams\\\"\\)", r"num\\(v\\.filamentPrice\\)\\s*/\\s*spool\\s*\\*\\s*num\\(v\\.usedGrams\\)"),
    ("electricity", r"num\\(\\\"printHours\\\"\\)\\s*\\*\\s*num\\(\\\"powerWatts\\\"\\)\\s*/\\s*1000\\s*\\*\\s*num\\(\\\"electricityRate\\\"\\)", r"num\\(v\\.printHours\\)\\s*\\*\\s*num\\(v\\.powerWatts\\)\\s*/\\s*1000\\s*\\*\\s*num\\(v\\.electricityRate\\)"),
    ("depreciation", r"num\\(\\\"printerPrice\\\"\\)\\s*/\\s*life\\s*\\*\\s*num\\(\\\"printHours\\\"\\)", r"num\\(v\\.printerPrice\\)\\s*/\\s*life\\s*\\*\\s*num\\(v\\.printHours\\)"),
    ("failure adjustment", r"base\\s*/\\s*\\(1\\s*-\\s*failure\\)", r"base\\s*/\\s*\\(1\\s*-\\s*failure\\)"),
    ("landed cost", r"production\\s*\\+\\s*packaging\\s*\\+\\s*shipping", r"production\\s*\\+\\s*packaging\\s*\\+\\s*shipping"),
    ("suggested price", r"landed\\s*/\\s*denominator", r"landed\\s*/\\s*denominator"),
    ("break-even price", r"landed\\s*/\\s*\\(1\\s*-\\s*fee\\)", r"landed\\s*/\\s*\\(1\\s*-\\s*fee\\)"),
    ("profit", r"suggested\\s*\\*\\s*\\(1\\s*-\\s*fee\\)\\s*-\\s*landed", r"suggested\\s*\\*\\s*\\(1\\s*-\\s*fee\\)\\s*-\\s*landed"),
]
prod_calc = production[production.find("function calculate()"):]
v3_calc = v3[v3.find("function calculate(v)"):]
for label, prod_pattern, v3_pattern in equations:
    assert re.search(prod_pattern, prod_calc), f"Production formula missing or changed: {label}"
    assert re.search(v3_pattern, v3_calc), f"V3 formula missing or changed: {label}"

assert 'href="/guide/"' in production or 'href="/guide/"' in v3, "Calculator article hub link missing"
assert "/guide/" in hub and 'rel="canonical"' in hub, "Article hub SEO metadata missing"
assert "prefers-reduced-motion:reduce" in css, "Reduced-motion CSS support missing"
assert "@media(max-width:700px)" in css, "Mobile layout breakpoint missing"
assert "main-preview.jsx" in preview, "Dedicated V3 preview entry missing"
assert "AUTO-SEO-GUIDES-START" in production and "AUTO-SEO-AUTOPOST-START" in production, "SEO publishing markers missing"
print("V3 compatibility checks passed: 14 inputs, core formula parity, article hub, responsive and reduced-motion support.")
