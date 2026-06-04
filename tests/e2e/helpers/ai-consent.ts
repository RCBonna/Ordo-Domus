import { expect, type Page } from '@playwright/test';

export async function acceptAiConsent(page: Page) {
  await expect(page.getByText('Consentimento de IA')).toBeVisible();
  await page.getByRole('button', { name: 'Aceitar e continuar' }).click();
}
