# UI/UX Upgrade Plan

## Current state
- Production is a static HTML/CSS/JavaScript site deployed from the `main` branch to Cloudflare Pages.
- SEO publishing workflows update the root `index.html` and `sitemap.xml`.
- The calculator's current input/output IDs and formulas are part of the compatibility surface.

## Proposed sequence
1. Establish the design system and compatibility checklist.
2. Build a separate React + Vite preview on the `improve/uiux-calculator-flow` branch.
3. Integrate Motion for React (`motion` package) for restrained, accessible transitions.
4. Add automated checks for production build, calculator behavior, metadata, local links, and guide URLs.
5. Adapt SEO publishing scripts/workflows so article publication continues to update the correct homepage/article listing and sitemap.
6. Review the branch diff and preview before changing Cloudflare Pages build settings or merging to `main`.

## Important implementation constraint
Do not merge a React/Vite entry point while Cloudflare Pages still publishes the root directory without a build. The production deployment configuration and SEO workflows must be migrated together or the site can break.

## Rollback
Until the new build is verified, keep `main` and the current Cloudflare Pages production settings unchanged. If a preview fails, discard or revise this branch without affecting production.
