#!/usr/bin/env python3
"""Submit the production sitemap to Search Console and inspect representative URLs.

Requires GSC_SERVICE_ACCOUNT_JSON to contain a Google service-account JSON key.
The service-account email must be added to the Search Console property with sufficient access.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from datetime import datetime, timezone
import xml.etree.ElementTree as ET

from google.oauth2 import service_account
from googleapiclient.discovery import build

ROOT = Path(__file__).resolve().parents[1]
SITE_URL = os.environ.get("GSC_SITE_URL", "https://3dprint.calquro.online/")
SITEMAP_URL = SITE_URL.rstrip("/") + "/sitemap.xml"
KEY_JSON = os.environ["GSC_SERVICE_ACCOUNT_JSON"]
REPORT = ROOT / "SEARCH-CONSOLE-REPORT.md"
SCOPES = ["https://www.googleapis.com/auth/webmasters"]


def main() -> None:
    key_info = json.loads(KEY_JSON)
    credentials = service_account.Credentials.from_service_account_info(key_info, scopes=SCOPES)

    sitemap_response = build("webmasters", "v3", credentials=credentials, cache_discovery=False)
    sitemap_response.sitemaps().submit(siteUrl=SITE_URL, feedpath=SITEMAP_URL).execute()

    inspection_api = build("searchconsole", "v1", credentials=credentials, cache_discovery=False)
    xml_root = ET.parse(ROOT / "sitemap.xml").getroot()
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap_urls = [
        node.text.strip()
        for node in xml_root.findall("sm:url/sm:loc", ns)
        if node.text and node.text.strip().startswith(SITE_URL)
    ]
    if not sitemap_urls:
        raise RuntimeError("No production URLs found in sitemap.xml")

    state_path = ROOT / "content-queue" / "published.json"
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {"published": []}
    published = state.get("published", [])
    urls_to_inspect = [SITE_URL]
    if published:
        latest_slug = published[-1].get("slug")
        if latest_slug:
            latest_url = SITE_URL.rstrip("/") + "/guide/" + latest_slug + "/"
            if latest_url in sitemap_urls:
                urls_to_inspect.append(latest_url)

    lines = [
        "# Google Search Console 自動確認レポート",
        "",
        f"- 確認日時（UTC）: {datetime.now(timezone.utc).isoformat()}",
        f"- プロパティ: {SITE_URL}",
        f"- サイトマップ送信: APIリクエスト成功（{SITEMAP_URL}）",
        f"- サイトマップ内の本番URL数: {len(sitemap_urls)}",
        "",
        "## URL検査",
        "",
        "| URL | 判定 | インデックス状態 | 最終クロール | 取得状態 |",
        "|---|---|---|---|---|",
    ]
    for url in urls_to_inspect:
        response = inspection_api.urlInspection().index().inspect(
            body={"inspectionUrl": url, "siteUrl": SITE_URL}
        ).execute()
        result = response.get("inspectionResult", {})
        index_status = result.get("indexStatusResult", {})
        verdict = index_status.get("verdict", "不明")
        coverage = index_status.get("coverageState", "不明")
        last_crawl = index_status.get("lastCrawlTime", "未取得")
        fetch_state = index_status.get("pageFetchState", "不明")
        lines.append(f"| {url} | {verdict} | {coverage} | {last_crawl} | {fetch_state} |")

    lines += [
        "",
        "> サイトマップ送信の成功は、Googleによる取得・インデックス登録を保証しません。",
        "> URL検査はホームページと最新公開記事の状態を記録します。Google側の反映には時間がかかる場合があります。",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
