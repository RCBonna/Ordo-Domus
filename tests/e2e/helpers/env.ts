import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadE2eEnv() {
  loadEnvFile('.env.local');
  loadEnvFile('.env.e2e.local', true);
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
