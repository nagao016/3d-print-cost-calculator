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

  test("Pro tools support batch rows, CSV export, filament limit, and saved-condition restore", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("formcost_pro_license", "playwright-test-token"));
    await page.route("**/api/verify-pro", route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ active: true }) })
    );
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /複数商品の一括見積もり/ })).toBeVisible({ timeout: 30000 });

    const batchRows = page.locator(".batch-estimate-table tbody tr");
    const initialRows = await batchRows.count();
    await page.getByRole("button", { name: /商品を追加/ }).click();
    await expect(batchRows).toHaveCount(initialRows + 1);

    const saveName = page.getByLabel("保存名");
    await saveName.fill("回帰テスト条件");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText("計算条件をこのブラウザに保存しました。")).toBeVisible();

    await page.evaluate(() => {
      const input = document.querySelector("#usedGrams");
      if (!(input instanceof HTMLInputElement)) throw new Error("#usedGrams input is missing");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, "100");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator("#usedGrams")).toHaveValue("100");
    await page.getByLabel("保存条件").selectOption({ label: "回帰テスト条件" });
    await page.getByRole("button", { name: "呼び出す", exact: true }).click();
    await expect(page.locator("#usedGrams")).toHaveValue("80");

    const addFilament = page.getByRole("button", { name: /フィラメントを追加/ });
    for (let i = 0; i < 10 && await addFilament.isEnabled(); i++) await addFilament.click();
    await expect(addFilament).toContainText("10/10");
    await expect(addFilament).toBeDisabled();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /CSVをダウンロード/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("3d-print-batch-estimates.csv");
  });

  test("mobile viewport remains within the screen at narrow and tablet widths", async ({ page }) => {
    for (const width of [320, 375, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /その造形に/ })).toBeVisible({ timeout: 30000 });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth
      }));
      expect(dimensions.document, `horizontal overflow at viewport width ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 2);
    }
  });


  test("transient Pro verification network failure preserves the saved token", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("formcost_pro_license", "playwright-test-token"));
    await page.route("**/api/verify-pro", route => route.abort());
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /その造形に/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("status")).toContainText("会員資格を確認できません。通信環境を確認してください。");
    expect(await page.evaluate(() => localStorage.getItem("formcost_pro_license"))).toBe("playwright-test-token");
  });

  test("temporary verification HTTP errors preserve the saved Pro token", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("formcost_pro_license", "playwright-test-token"));
    await page.route("**/api/verify-pro", route =>
      route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ active: false, error: "設定未完了です。" }) })
    );
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /その造形に/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("status")).toContainText("会員資格を確認できません。通信環境を確認してください。");
    expect(await page.evaluate(() => localStorage.getItem("formcost_pro_license"))).toBe("playwright-test-token");
  });

  test("clearing browser storage fails closed and does not grant Pro access", async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("seeded-pro-token")) {
        localStorage.setItem("formcost_pro_license", "playwright-test-token");
        sessionStorage.setItem("seeded-pro-token", "1");
      }
    });
    await page.route("**/api/verify-pro", route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ active: true }) })
    );
    await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /複数商品の一括見積もり/ })).toBeVisible({ timeout: 30000 });
    await page.evaluate(() => localStorage.removeItem("formcost_pro_license"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /その造形に/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("heading", { name: /複数商品の一括見積もり/ })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("formcost_pro_license"))).toBeNull();
  });

});
