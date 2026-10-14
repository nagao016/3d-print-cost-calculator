# UI/UX Design System — 3D Print Cost Calculator

## Product goal
Help a hobbyist or small seller estimate the per-item production cost and a sensible selling price quickly, with transparent assumptions rather than unexplained numbers.

## UX principles
1. **Clarity before decoration** — keep all cost inputs grouped by purpose and use plain Japanese labels.
2. **Progressive disclosure** — explain less-common assumptions (depreciation, failure rate, fees) next to the field or in compact help text.
3. **Visible result** — make suggested price, total cost, profit, and margin the strongest visual hierarchy.
4. **Trust through transparency** — state what is included and excluded; identify estimates as estimates.
5. **Mobile-first operation** — one-column form on narrow screens, large tap targets, no horizontal overflow, numeric keyboards for numeric inputs.
6. **Accessible motion** — animations should be brief and subtle, respect `prefers-reduced-motion`, and never be required to understand a result.
7. **No surprise changes** — preserve calculation formulas and input meanings unless a formula change is separately tested and documented.

## Visual direction
- Style: modern, calm, precise, approachable utility.
- Background: pale cool neutral; cards: white; primary text: deep navy.
- Primary action: saturated blue; positive result: accessible green; warnings: amber/red with text, not color alone.
- Use consistent spacing, clear labels, visible focus rings, readable line length, and restrained shadows.
- Avoid excessive gradients, decorative animation, tiny secondary text, and competing calls to action.

## Layout hierarchy
1. Compact header with product identity and navigation.
2. Intro explaining what the calculator does.
3. Input groups:
   - Material
   - Printing and machine usage
   - Selling and fulfillment costs
4. Results panel with suggested price and cost breakdown.
5. Short calculation notes and FAQ/guide links.
6. SEO guide/article links remain crawlable and accessible.

## Interaction requirements
- Inputs update calculations predictably; keyboard input remains usable.
- Reset restores the documented defaults.
- Copy action reports success or failure accessibly.
- Result changes may use a short Motion animation, but avoid animating every keystroke in a distracting way.
- Respect reduced-motion preferences.
- Use semantic HTML, explicit labels, useful error/warning text, and visible keyboard focus.

## Responsive acceptance criteria
- At 320px viewport width, no page-level horizontal scrolling.
- At phone widths, inputs and results are single-column with comfortable touch targets.
- At desktop widths, inputs and result hierarchy use space efficiently without long, hard-to-scan rows.
- Sticky navigation must not obscure anchor targets.

## Performance and SEO guardrails
- Keep the calculator usable if animation code fails or motion is disabled.
- Preserve title, description, canonical, Open Graph metadata, sitemap, guide URLs, and existing article links.
- Avoid unnecessary runtime dependencies.
- Existing article-publishing scripts currently edit the root `index.html`; they must be updated or kept compatible before changing the production build entry point.
- Do not switch Cloudflare Pages build settings until the preview build and SEO publishing workflow have been validated.

## Acceptance checklist
- [ ] All current input IDs and calculation outputs remain supported or have tested replacements.
- [ ] Calculation values match the current production implementation for representative inputs.
- [ ] Reset and copy controls work.
- [ ] Keyboard-only operation and focus visibility are verified.
- [ ] Reduced-motion preference is respected.
- [ ] Phone and desktop layouts are checked.
- [ ] Guide pages, sitemap, canonical URLs, and automated publishing remain intact.
- [ ] Production is not changed before review.
