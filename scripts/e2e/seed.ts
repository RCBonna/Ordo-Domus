import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type EnvMap = Record<string, string>;

interface UnitRecord {
  id: string;
  nome: string;
  codigo_convite?: string | null;
}

interface SeedContext {
  supabaseUrl: string;
  serviceRoleKey: string;
  userEmail: string;
  userPassword: string;
  unitName: string;
  unitCode: string;
}

loadEnvFile('.env.local');
loadEnvFile('.env.e2e.local', true);

const context = readContext();
const admin = createClient(context.supabaseUrl, context.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const user = await ensureUser(context.userEmail, context.userPassword);
const unit = await ensureUnit(context.unitName, context.unitCode);
await ensureMembership(unit.id, user.id);
await seedInventory(unit.id);
await seedShoppingList(unit.id);
await seedTriage(unit.id);

console.log(`E2E seed pronto: ${context.userEmail} / unidade ${context.unitName} (${unit.id})`);

function readContext(): SeedContext {
  const env = process.env as EnvMap;
  const supabaseUrl = env.E2E_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.E2E_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const userEmail = env.E2E_USER_EMAIL;
  const userPassword = env.E2E_USER_PASSWORD;

  const missing = [
    ['VITE_SUPABASE_URL ou E2E_SUPABASE_URL', supabaseUrl],
    ['E2E_SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
    ['E2E_USER_EMAIL', userEmail],
    ['E2E_USER_PASSWORD', userPassword],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Variaveis obrigatorias ausentes: ${missing.map(([name]) => name).join(', ')}`);
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    userEmail,
    userPassword,
    unitName: env.E2E_UNIT_NAME || 'Ordo E2E',
    unitCode: env.E2E_UNIT_CODE || 'ORDO-E2E',
  };
}

function loadEnvFile(fileName: string, override = false) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;

  const content = readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || (!override && process.env[key])) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

async function ensureUser(email: string, password: string) {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        e2e: true,
        app: 'ordo-domus',
      },
    });

    if (error) throw error;
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      e2e: true,
      app: 'ordo-domus',
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Usuario E2E nao foi criado.');
  return data.user;
}

async function findUserByEmail(email: string): Promise<User | null> {
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users as User[];
    const user = users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function ensureUnit(name: string, code: string): Promise<UnitRecord> {
  const byInviteCode = await admin
    .from('unidades')
    .select('id,nome,codigo_convite')
    .eq('codigo_convite', code)
    .maybeSingle();

  if (!byInviteCode.error) {
    if (byInviteCode.data) {
      const { data, error } = await admin
        .from('unidades')
        .update({ nome: name })
        .eq('id', byInviteCode.data.id)
        .select('id,nome,codigo_convite')
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await admin
      .from('unidades')
      .insert({
        nome: name,
        codigo_convite: code,
      })
      .select('id,nome,codigo_convite')
      .single();

    if (error) throw error;
    return data;
  }

  if (!isMissingInviteCodeColumn(byInviteCode.error)) {
    throw byInviteCode.error;
  }

  console.warn('Coluna unidades.codigo_convite ausente; seed E2E usando nome/id da unidade como fallback.');

  const { data: existingByName, error: selectByNameError } = await admin
    .from('unidades')
    .select('id,nome')
    .eq('nome', name)
    .limit(1)
    .maybeSingle();

  if (selectByNameError) throw selectByNameError;

  if (existingByName) {
    const { data, error } = await admin
      .from('unidades')
      .update({ nome: name })
      .eq('id', existingByName.id)
      .select('id,nome')
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await admin
    .from('unidades')
    .insert({
      nome: name,
    })
    .select('id,nome')
    .single();

  if (error) throw error;
  return data;
}

function isMissingInviteCodeColumn(error: { code?: string; message?: string } | null) {
  return error?.code === '42703' && error.message?.includes('codigo_convite');
}

async function ensureMembership(unitId: string, userId: string) {
  const { error } = await admin
    .from('membros_unidades')
    .upsert({
      unidade_id: unitId,
      user_id: userId,
      papel: 'admin',
      status: 'aprovado',
    }, { onConflict: 'unidade_id,user_id' });

  if (error) throw error;
}

async function seedInventory(unitId: string) {
  const seedNames = ['E2E Cafe', 'E2E Arroz', 'E2E Sabao', 'E2E Macarrao'];

  const { error: cleanupError } = await admin
    .from('itens_inventario')
    .delete()
    .eq('unidade_id', unitId)
    .in('nome', seedNames);

  if (cleanupError) throw cleanupError;

  const { error } = await admin
    .from('itens_inventario')
    .insert([
      {
        unidade_id: unitId,
        nome: 'E2E Cafe',
        categoria: 'Alimentos',
        comodo: 'Cozinha',
        armario: 'Armario E2E',
        caixa: 'Prateleira 1',
        validade: '31/12/2099',
        quantidade: 2,
      },
      {
        unidade_id: unitId,
        nome: 'E2E Arroz',
        categoria: 'Alimentos',
        comodo: 'Despensa',
        armario: 'Armario E2E',
        caixa: 'Prateleira 2',
        validade: '',
        quantidade: 1,
      },
      {
        unidade_id: unitId,
        nome: 'E2E Sabao',
        categoria: 'Limpeza',
        comodo: 'Lavanderia',
        armario: 'Armario E2E',
        caixa: 'Caixa E2E',
        validade: '',
        quantidade: 0,
      },
    ]);

  if (error) throw error;
}

async function seedTriage(unitId: string) {
  const { error: cleanupPendingError } = await admin
    .from('importacoes_pendentes')
    .delete()
    .eq('unidade_id', unitId)
    .like('nome_bruto', 'E2E %');

  if (cleanupPendingError) throw cleanupPendingError;

  const { error: cleanupDictionaryError } = await admin
    .from('dicionario_produtos')
    .delete()
    .eq('unidade_id', unitId)
    .like('nome_bruto_cupom', 'E2E %');

  if (cleanupDictionaryError) throw cleanupDictionaryError;

  const { error: dictionaryError } = await admin
    .from('dicionario_produtos')
    .insert({
      unidade_id: unitId,
      nome_bruto_cupom: 'E2E CAFE TORRADO 500G',
      nome_oficial_inventario: 'E2E Cafe',
      categoria: 'Alimentos',
      comodo: 'Cozinha',
    });

  if (dictionaryError) throw dictionaryError;

  const { error: pendingError } = await admin
    .from('importacoes_pendentes')
    .insert([
      {
        unidade_id: unitId,
        nome_bruto: 'E2E CAFE TORRADO 500G',
        categoria_sugerida: 'Alimentos',
        quantidade: 1,
        valor_unitario: 19.9,
        processado: false,
      },
      {
        unidade_id: unitId,
        nome_bruto: 'E2E DETERGENTE NEUTRO',
        categoria_sugerida: 'Limpeza',
        quantidade: 2,
        valor_unitario: 3.5,
        processado: false,
      },
    ]);

  if (pendingError) throw pendingError;
}

async function seedShoppingList(unitId: string) {
  const { error: cleanupError } = await admin
    .from('lista_compras')
    .delete()
    .eq('unidade_id', unitId)
    .like('nome', 'E2E %');

  if (cleanupError) throw cleanupError;

  const { error } = await admin
    .from('lista_compras')
    .insert([
      {
        unidade_id: unitId,
        nome: 'E2E Pilha AA',
        quantidade: 2,
        observacao: 'Seed E2E lista de compras',
        status: 'pendente',
        origem: 'manual',
      },
    ]);

  if (error) throw error;
}
