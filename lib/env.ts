/**
 * Read env vars with fallbacks: process.env, dotenv, then manual .env parse.
 * Use for API keys and other config that may not be loaded by Next.js at runtime.
 *
 * When running inside a git worktree (e.g. .claude/worktrees/*), the .env file
 * lives in the repo root, not in cwd. We walk up from cwd to find the nearest
 * .env so keys are always resolved regardless of where `next dev` is started.
 */

import path from 'path';
import fs from 'fs';

/** Walk up from `start` and return the first directory containing `.env`, or undefined. */
function findEnvDir(start: string): string | undefined {
  let dir = path.resolve(start);
  const { root } = path.parse(dir);
  while (true) {
    if (fs.existsSync(path.join(dir, '.env'))) return dir;
    if (dir === root) return undefined;
    dir = path.dirname(dir);
  }
}

export function getEnvVar(name: string): string | undefined {
  // 1. Already in process.env (e.g. Next.js loaded it, or shell export)
  let key = process.env[name];
  if (key && key.trim()) return key.trim();

  // 2. Find the nearest .env walking up from cwd (handles worktrees / monorepos)
  const envDir = findEnvDir(process.cwd());

  // 3. dotenv fallback — override:true so shell-level empty vars don't shadow .env values
  if (envDir) {
    try {
      require('dotenv').config({ path: path.join(envDir, '.env'), override: true });
      key = process.env[name];
      if (key && key.trim()) return key.trim();
    } catch {
      // ignore
    }
  }

  // 4. Manual parse as last resort
  if (envDir) {
    try {
      const envPath = path.join(envDir, '.env');
      const raw = fs.readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '');
      const prefix = name + '=';
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith(prefix)) {
          const val = trimmed.slice(prefix.length).trim().replace(/^["']|["']$/g, '');
          if (val) return val;
        }
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

/** Returns whether the var is set and its length (for env-check, no value leaked). */
export function getEnvKeyInfo(name: string): { set: boolean; length: number } {
  const val = getEnvVar(name);
  if (!val) return { set: false, length: 0 };
  return { set: true, length: val.length };
}
