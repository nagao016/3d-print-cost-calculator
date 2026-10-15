import { test, expect } from "@playwright/test";

const previewUrl =
  process.env.PREVIEW_URL ||
  "https://feat-privacy-first-subscript.3d-print-cost-calculator-7ce.pages.dev/";

test.describe("Toolia / 3D print calculator preview", () => {
  test("loads the calculator and recalculates when material usage changes", async ({ page }) => {
    // The expected suggested selling price is a Pro-only display, so enable Pro only in this test context.
    await page.addInitScript(() => localStorage.setItem("formcost_pro_license", "playwright-test-token"));
    await page.route("**/api/verify-pro", route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ active: true }) })
    );
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /その造形に/ })).toBeVisible({ timeout: 30000 });

    const usedGrams = page.locator("#usedGrams");
    await expect(usedGrams).toBeVisible({ timeout: 10000 });
    await expect(usedGrams).toHaveValue("80");
    const before = await page.locator(".live-estimate, .estimate-value").first().textContent().catch(() => "");
    // Force the controlled numeric input directly; the page's animated layout can interfere with scrolling.
    await usedGrams.fill("100", { timeout: 10000, force: true });
    await expect(usedGrams).toHaveValue("100");
    await expect(page.getByText("¥1,207", { exact: true })).toBeVisible({ timeout: 10000 });
    expect(before).toBeDefined();
  });

  test("navigates through material, machine and selling steps", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("formcost_pro_license", "playwright-test-token"));
    await page.route("**/api/verify-pro", route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ active: true }) })
    );
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /材料を設定する/ })).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: /次の設定へ/ }).click();
    await expect(page.getByRole("heading", { name: /製造を設定する/ })).toBeVisible();
    await page.getByRole("button", { name: /次の設定へ/ }).click();
    await expect(page.getByRole("heading", { name: /販売を設定する/ })).toBeVisible();
    await page.getByRole("button", { name: /価格を確認/ }).click();
    await expect(page.getByRole("heading", { name: /価格を、分解して考える/ })).toBeVisible();
  });

  test("Pro tools render in a test-only licensed browser context", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("formcost_pro_license", "playwright-test-token"));
    await page.route("**/api/verify-pro", route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ active: true }) })
    );
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /複数商品の一括見積もり/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("heading", { name: /フィラメント最大10種類の比較/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /計算条件の保存・呼び出し/ })).toBeVisible();
  });

  test("mobile viewport does not create document-level horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /その造形に/ })).toBeVisible({ timeout: 30000 });
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 2);
  });
});
