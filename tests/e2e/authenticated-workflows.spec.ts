import { expect, test } from '@playwright/test';
import { acceptAiConsent } from './helpers/ai-consent';
import { hasAuthenticatedE2eEnv, loginWithSeedUser } from './helpers/auth';

test.describe('fluxos autenticados com seed', () => {
  test.skip(!hasAuthenticatedE2eEnv, 'Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar os fluxos autenticados.');

  test.beforeEach(async ({ page }) => {
    await loginWithSeedUser(page);
  });

  test('importacao de cupom usa IA mockada e cria triagem pendente', async ({ page }) => {
    await mockReceiptExtraction(page);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Importar Cupom' }).click();
    const fileChooser = await fileChooserPromise;
    const uniqueColor = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    await fileChooser.setFiles({
      name: 'cupom-e2e.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#${uniqueColor}"/></svg>`),
    });
    await acceptAiConsent(page);

    await expect(page.getByText(/Cupom importado!/)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Triagem Pendente/ }).click();

    await expect(page.getByText('Triagem de Importações')).toBeVisible();
    await expect(page.getByText('E2E BISCOITO TESTE').first()).toBeVisible();
  });

  test('inventario por foto usa IA mockada e cria triagem pendente', async ({ page }) => {
    await mockSnapshotExtraction(page);

    const roomInput = page.getByPlaceholder('Cômodo da foto');
    const cabinetInput = page.getByPlaceholder('Armário/local');
    const boxInput = page.getByPlaceholder('Prateleira/caixa');

    await expect(roomInput).toHaveAttribute('autocomplete', 'off');
    await expect(cabinetInput).toHaveAttribute('autocomplete', 'off');
    await expect(boxInput).toHaveAttribute('autocomplete', 'off');
    await expect(roomInput).toHaveAttribute('list', 'snapshot-comodo-suggestions');
    await expect(cabinetInput).toHaveAttribute('list', 'snapshot-armario-suggestions');
    await expect(boxInput).toHaveAttribute('list', 'snapshot-caixa-suggestions');

    await expect(page.locator('datalist#snapshot-comodo-suggestions option[value="Cozinha"]')).toHaveCount(1, { timeout: 20_000 });
    await roomInput.fill('Cozinha');
    await expect(page.locator('datalist#snapshot-armario-suggestions option[value="Armario E2E"]')).toHaveCount(1);
    await cabinetInput.fill('Armario E2E');
    await expect(page.locator('datalist#snapshot-caixa-suggestions option[value="Prateleira 1"]')).toHaveCount(1);

    await cabinetInput.fill('Despensa E2E');
    await boxInput.fill('Prateleira 1');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Inventário por Foto' }).click();
    const fileChooser = await fileChooserPromise;
    const uniqueColor = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    await fileChooser.setFiles({
      name: 'snapshot-e2e.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"><rect width="16" height="12" fill="#${uniqueColor}"/></svg>`),
    });
    await acceptAiConsent(page);

    await expect(page.getByText(/Inventário por Foto importado!/)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Triagem Pendente/ }).click();

    await expect(page.getByText('Triagem de Importações')).toBeVisible();
    await expect(page.getByText('E2E ARROZ SNAPSHOT').first()).toBeVisible();
    await expect(page.getByText('Foto').first()).toBeVisible();
    await expect(page.getByText('82% confiança').first()).toBeVisible();
    await expect(page.locator('input[value="31/12/2099"]').first()).toBeVisible();
  });

  test('lista de compras mostra alertas e item manual seed', async ({ page }) => {
    await page.getByRole('button', { name: 'FALTAS' }).click();

    await expect(page.getByRole('heading', { name: 'Lista de Compras' })).toBeVisible();
    await expect(page.getByText('E2E Pilha AA')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /E2e sabao Limpeza - Lavanderia Total 0/i })).toBeVisible();
  });

  test('lista de compras permite adicionar item manual', async ({ page }) => {
    await page.getByRole('button', { name: 'FALTAS' }).click();

    const itemName = `E2E Papel Toalha ${Date.now()}`;
    await page.getByPlaceholder('Adicionar item manual...').fill(itemName);
    await page.getByPlaceholder('Observação opcional').fill('Criado pelo Playwright');
    await page.getByRole('button', { name: 'Adicionar' }).click();

    await expect(page.getByText(itemName)).toBeVisible({ timeout: 20_000 });
  });

  test('admin edita nome da unidade sem recarregar', async ({ page }) => {
    await page.getByRole('button', { name: 'Gerenciar acessos e compartilhar' }).click();

    const input = page.getByLabel('Nome da unidade');
    await expect(input).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acesso à Unidade' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('admin-panel-loading')).toHaveCount(0);

    const originalName = await input.inputValue();
    const temporaryName = originalName === 'Ordo E2E Config' ? 'Ordo E2E Config Alt' : 'Ordo E2E Config';

    await input.fill(temporaryName);
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeEnabled();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('button', { name: temporaryName })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled();

    await input.fill(originalName);
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeEnabled();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('button', { name: originalName })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  test('admin ve erro recuperavel quando governanca da unidade demora demais', async ({ page }) => {
    await page.route('**/rest/v1/rpc/listar_membros', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 8_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }).catch(() => undefined);
    });

    await page.getByRole('button', { name: 'Gerenciar acessos e compartilhar' }).click();

    await expect(page.getByTestId('admin-panel-loading')).toBeVisible();
    await expect(page.getByText('Não foi possível carregar os acessos agora.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    await expect(page.getByTestId('admin-panel-loading')).toHaveCount(0);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});

async function mockReceiptExtraction(page: import('@playwright/test').Page) {
  await page.route('**/functions/v1/extract-inventory', async (route) => {
    const body = route.request().postDataJSON() as { mode?: string };

    if (body.mode !== 'receipt') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: [
          {
            item: 'E2E BISCOITO TESTE',
            categoria: 'Alimentos',
            quantidade: 1,
            valor: 4.99,
          },
        ],
      }),
    });
  });
}

async function mockSnapshotExtraction(page: import('@playwright/test').Page) {
  await page.route('**/functions/v1/extract-inventory', async (route) => {
    const body = route.request().postDataJSON() as { mode?: string };

    if (body.mode !== 'snapshot') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: [
          {
            item: 'E2E ARROZ SNAPSHOT',
            categoria: 'Alimentos',
            quantidade: 2,
            comodo: 'Cozinha',
            armario: 'Despensa E2E',
            caixa: 'Prateleira 1',
            validade: '31/12/2099',
            marca: 'E2E',
            codigo_barras: '7890000000000',
            confianca: 0.82,
            observacao: 'Item visivel em teste automatizado.',
          },
        ],
      }),
    });
  });
}
