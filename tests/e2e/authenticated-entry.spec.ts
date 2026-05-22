import { expect, test } from '@playwright/test';
import { failOnConsoleErrors } from './helpers/console';
import { gotoApp } from './helpers/navigation';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe('entrada autenticada', () => {
  test.skip(!email || !password, 'Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar o fluxo autenticado.');

  test.beforeEach(async ({ page }) => {
    const getConsoleErrors = failOnConsoleErrors(page);

    await gotoApp(page);
    await page.getByLabel('E-mail').fill(email!);
    await page.getByRole('textbox', { name: 'Senha' }).fill(password!);
    await page.getByRole('button', { name: 'Acessar Sistema' }).click();

    await expect(page.getByText('Nova Entrada')).toBeVisible({ timeout: 20_000 });
    expect(getConsoleErrors()).toEqual([]);
  });

  test('login abre a entrada operacional da unidade seed', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Falar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importar Cupom' })).toBeVisible();
    await expect(page.getByPlaceholder('Ex: Guardei 2 pacotes de café no armário superior da cozinha...')).toBeVisible();
  });

  test('entrada por texto usa IA mockada e salva no inventario', async ({ page }) => {
    await mockTextExtraction(page);

    await page.getByPlaceholder('Ex: Guardei 2 pacotes de café no armário superior da cozinha...')
      .fill('Guardei um pacote de macarrao e2e na cozinha.');
    await page.getByRole('button', { name: 'Extrair Dados' }).click();

    await expect(page.getByText('Item Identificado')).toBeVisible();
    await expect(page.locator('input[value="E2E Macarrao"]')).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Item gravado com sucesso no inventário!').or(page.getByText('A quantidade foi somada a um item existente!'))).toBeVisible({ timeout: 20_000 });
  });

  test('inventario lista item seed', async ({ page }) => {
    await page.getByRole('button', { name: 'INVENTÁRIO' }).click();
    await page.getByPlaceholder('Buscar por nome, categoria ou cômodo...').fill('E2E Cafe');

    await expect(page.getByText('E2E Cafe')).toBeVisible({ timeout: 20_000 });
  });

  test('triagem seed abre itens pendentes', async ({ page }) => {
    await page.getByRole('button', { name: /Triagem Pendente/ }).click();

    await expect(page.getByText('Triagem de Cupom Fiscal')).toBeVisible();
    await expect(page.getByText('E2E CAFE TORRADO 500G')).toBeVisible();
    await expect(page.getByText('E2E DETERGENTE NEUTRO')).toBeVisible();
  });
});

async function mockTextExtraction(page: import('@playwright/test').Page) {
  await page.route('**/functions/v1/extract-inventory', async (route) => {
    const body = route.request().postDataJSON() as { mode?: string; text?: string };

    if (body.mode !== 'text') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          item: 'E2E Macarrao',
          categoria: 'Alimentos',
          comodo: 'Cozinha',
          armario: 'Armario E2E',
          caixa: 'Prateleira 3',
          validade: '31/12/2099',
          quantidade: 1,
          transcricao: body.text || 'Guardei um pacote de macarrao e2e na cozinha.',
        },
      }),
    });
  });
}
