/**
 * Read env vars with fallbacks: process.env, dotenv, then manual .env parse.
 * Use for API keys and other config that may not be loaded by Next.js at runtime.
 */

import path from 'path';
import fs from 'fs';

export function getEnvVar(name: string): string | undefined {
  let key = process.env[name];
  if (key && key.trim()) return key.trim();
  try {
    // Optional dotenv fallback when Next.js hasn't loaded .env (e.g. serverless)
    require('dotenv').config({ path: path.join(process.cwd(), '.env') });
    key = process.env[name];
    if (key && key.trim()) return key.trim();
  } catch {
    // ignore
  }
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '');
      const prefix = name + '=';
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith(prefix)) {
          const val = trimmed.slice(prefix.length).trim().replace(/^["']|["']$/g, '');
          if (val) return val;
        }
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

/** Returns whether the var is set and its length (for env-check, no value leaked). */
export function getEnvKeyInfo(name: string): { set: boolean; length: number } {
  const val = getEnvVar(name);
  if (!val) return { set: false, length: 0 };
  return { set: true, length: val.length };
}
