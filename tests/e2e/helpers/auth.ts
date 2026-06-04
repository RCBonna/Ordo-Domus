import { expect, type Page } from '@playwright/test';
import { failOnConsoleErrors } from './console';
import { gotoApp } from './navigation';

export const e2eEmail = process.env.E2E_USER_EMAIL;
export const e2ePassword = process.env.E2E_USER_PASSWORD;
export const hasAuthenticatedE2eEnv = Boolean(e2eEmail && e2ePassword);

export async function loginWithSeedUser(page: Page) {
  const getConsoleErrors = failOnConsoleErrors(page);

  await gotoApp(page);
  await page.getByLabel('E-mail').fill(e2eEmail!);
  await page.getByRole('textbox', { name: 'Senha' }).fill(e2ePassword!);
  await page.getByRole('button', { name: 'Acessar Sistema' }).click();

  await expect(page.getByText('Nova Entrada')).toBeVisible({ timeout: 20_000 });
  expect(getConsoleErrors()).toEqual([]);
}
