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
    const scenarioPrice = page.locator("#results .scenario-price").first();
    await expect(scenarioPrice).toBeVisible({ timeout: 10000 });
    const priceBefore = (await scenarioPrice.textContent())?.trim();
    // Use the native input setter and bubble React's input event; this avoids flaky browser typing against the animated form.
    // Query the live DOM inside the page instead of asking Playwright to retain a locator
    // across Motion/React renders. The assertion above confirms the field exists first.
    await page.evaluate(() => {
      const input = document.querySelector("#usedGrams");
      if (!(input instanceof HTMLInputElement)) throw new Error("#usedGrams input is missing");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, "100");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(usedGrams).toHaveValue("100");
    await expect(scenarioPrice).not.toHaveText(priceBefore, { timeout: 10000 });
    await expect(scenarioPrice).toHaveText("¥805", { timeout: 10000 });
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


  test("free users see locked Pro results and receive a clear checkout setup error", async ({ page }) => {
    await page.route("**/api/verify-pro", route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ active: false }) })
    );
    await page.route("**/api/create-checkout-session", route =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Pro決済の設定が完了していません。" })
      })
    );
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /その造形に/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Pro限定").first()).toBeVisible();
    await page.getByRole("button", { name: /Pro 月額500円/ }).first().click();
    await expect(page.getByRole("status")).toContainText("Pro決済の設定が完了していません。");
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
