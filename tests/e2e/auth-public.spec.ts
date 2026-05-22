import { expect, test } from '@playwright/test';
import { failOnConsoleErrors } from './helpers/console';
import { gotoApp } from './helpers/navigation';

test.describe('auth publica', () => {
  test('carrega a tela de login sem erros de console', async ({ page }) => {
    const getConsoleErrors = failOnConsoleErrors(page);

    await gotoApp(page);

    await expect(page.getByRole('heading', { name: 'Bem-vindo ao Ordo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar Conta' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Senha' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acessar Sistema' })).toBeVisible();

    expect(getConsoleErrors()).toEqual([]);
  });

  test('alterna entre login e cadastro preservando campos principais', async ({ page }) => {
    await gotoApp(page);

    await page.getByRole('button', { name: 'Criar Conta' }).click();
    await expect(page.getByRole('button', { name: 'Criar Nova Conta' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Senha' })).toBeVisible();

    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('button', { name: 'Acessar Sistema' })).toBeVisible();
  });

  test('permite alternar visibilidade da senha', async ({ page }) => {
    await gotoApp(page);

    const password = page.getByRole('textbox', { name: 'Senha' });
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });
});
