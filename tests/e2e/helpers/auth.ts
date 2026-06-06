import { expect, type Page } from '@playwright/test';
import { failOnConsoleErrors } from './console';
import { gotoApp } from './navigation';

export const e2eEmail = process.env.E2E_USER_EMAIL;
export const e2ePassword = process.env.E2E_USER_PASSWORD;
export const e2eUnitName = process.env.E2E_UNIT_NAME || 'Ordo E2E';
export const hasAuthenticatedE2eEnv = Boolean(e2eEmail && e2ePassword);

export async function loginWithSeedUser(page: Page) {
  const getConsoleErrors = failOnConsoleErrors(page);

  await gotoApp(page);
  await page.getByLabel('E-mail').fill(e2eEmail!);
  await page.getByRole('textbox', { name: 'Senha' }).fill(e2ePassword!);
  await page.getByRole('button', { name: 'Acessar Sistema' }).click();

  const entryHeading = page.getByText('Nova Entrada');
  try {
    await expect(entryHeading).toBeVisible({ timeout: 20_000 });
  } catch (error) {
    const unitButton = page.getByRole('button', { name: e2eUnitName, exact: true });
    if (await unitButton.count() === 0) throw error;
    await unitButton.click();
    await expect(entryHeading).toBeVisible({ timeout: 20_000 });
  }
  expect(getConsoleErrors()).toEqual([]);
}
