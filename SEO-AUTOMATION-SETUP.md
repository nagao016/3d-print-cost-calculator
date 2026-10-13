# 3D Print Cost Calculator — Automation Starter

This starter adds a conservative first step toward unattended operation: a nightly static-site check and a report artifact.

## Files
- `.github/workflows/nightly-site-check.yml`: scheduled at 03:00 JST and manually runnable from GitHub Actions.
- `scripts/check_site.py`: checks basic HTML SEO signals, duplicate IDs, image alt text, and likely missing local link targets.
- `robots.txt` and `sitemap.xml`: basic crawl-discovery files for the current Cloudflare Pages URL.

## How to add
1. Download and extract this ZIP.
2. Copy the included files/folders into the root of the existing `nagao016/3d-print-cost-calculator` repository, preserving the `.github/workflows/` and `scripts/` paths.
3. Commit to a new branch first, for example `automation/nightly-site-check`.
4. Open a pull request and inspect the diff.
5. Merge after confirming that the existing `index.html` and deployment workflow are unchanged.
6. In GitHub, open **Actions → Nightly Site Check → Run workflow** to test it.
7. After it succeeds, the schedule runs daily at 03:00 Japan time. GitHub scheduled workflows can be delayed during busy periods and may be disabled for inactive public repositories, so check the Actions tab periodically.

## Important safety notes
- This does not yet write or publish new AI-generated content.
- It does not change the existing calculator logic or Cloudflare build settings.
- The report is uploaded as a GitHub Actions artifact for 14 days.
- `robots.txt` and `sitemap.xml` use the current `pages.dev` URL. When a custom domain is adopted, update both files and add a canonical URL strategy.
- Do not add API keys or payment secrets to the repository.
- This checker is a starter, not a guarantee of SEO quality or browser-level functionality.
