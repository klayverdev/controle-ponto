import { expect, test } from "@playwright/test";

const token = process.env.E2E_KIOSK_TOKEN ?? "";
const pin = process.env.E2E_PIN ?? "482913";

test("kiosk sem terminal autorizado", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Terminal não autorizado.")).toBeVisible();
});

test("fluxo do funcionário: PIN, confirmação e retorno automático", async ({ page, request }) => {
  test.skip(!token, "E2E_KIOSK_TOKEN não definido");
  const origin = new URL(page.url() === "about:blank" ? (process.env.APP_ORIGIN ?? "http://localhost:3000") : page.url()).origin;
  await page.goto("/ativar");
  await page.getByLabel("Token do terminal").fill(token);
  await page.getByRole("button", { name: "Ativar" }).click();
  await expect(page.getByText("CONTROLE DE PONTO")).toBeVisible();

  for (const digit of pin) await page.getByRole("button", { name: digit, exact: true }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByRole("status")).toContainText(/registrada/i);
  await expect(page.getByText("Informe seu PIN")).toBeVisible({ timeout: 8000 });
  expect(origin).toBeTruthy();
  expect(request).toBeTruthy();
});

test("rotas administrativas exigem autenticação", async ({ page, request }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login/);
  expect((await request.get("/api/admin/reports/general?year=2026&month=9&format=csv")).status()).toBe(401);
});
