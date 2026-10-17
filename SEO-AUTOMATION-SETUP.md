# 3D Print Cost Calculator — SEO Automation

Production site: https://3dprint.calquro.online/

## Existing automated workflows
- `.github/workflows/auto-publish-seo-guides.yml`: publishes the curated SEO guide pages daily at approximately 04:00 JST.
- `.github/workflows/daily-auto-publish-article.yml`: publishes one queued guide article daily at approximately 04:15 JST.
- `.github/workflows/nightly-site-check.yml`: runs static-site checks daily at approximately 03:00 JST.
- The daily article workflow validates that the generated sitemap contains production URLs only, then checks the live sitemap after Cloudflare Pages deployment.
- `scripts/search_console_sync.py`: submits the sitemap to Google Search Console and inspects the homepage plus the latest published article, when API credentials are configured.

GitHub scheduled workflows can be delayed. Check the Actions tab and the uploaded report artifacts if a run appears late.

## Enable Search Console API automation

The Search Console integration is deliberately skipped until a secret is configured. It does not store credentials in source control.

1. In Google Cloud Console, select or create a project and enable **Google Search Console API**.
2. Create a service account and create a JSON key for it. Handle the key as a password.
3. In Google Search Console, add the service-account email as a user of the URL-prefix property `https://3dprint.calquro.online/` with sufficient permission to submit sitemaps and inspect URLs. The property must be verified and accessible to that account.
4. In GitHub, open the repository **Settings → Secrets and variables → Actions → New repository secret**.
5. Set the secret name to `GSC_SERVICE_ACCOUNT_JSON` and paste the full service-account JSON key as the value. Do not commit the JSON key to the repository or place it in an issue or log.
6. Run **Actions → Daily Auto Publish Article → Run workflow** to test the integration. The run submits `https://3dprint.calquro.online/sitemap.xml` and inspects the homepage plus the latest published article.
7. Open the run's artifact named `auto-publish-article-report` and review `SEARCH-CONSOLE-REPORT.md`.

## Interpreting the report
- “Sitemap submission succeeded” means Google's API accepted the submission request. It does not mean Google has fetched every URL.
- URL Inspection reports Google's currently known state for the inspected URLs. Indexing can take time, and an unindexed result is not automatically a workflow failure.
- API errors, missing permissions, or an unverified property should be resolved before treating the integration as operational.

## Security and scope
- Never add API keys, service-account JSON, payment secrets, or other credentials to source files.
- Search Console reporting checks only the homepage and latest published article per run; it is not a full-site inspection of every URL.
- The nightly static checker is a basic quality check, not a guarantee of rankings, indexing, or browser-level functionality.
