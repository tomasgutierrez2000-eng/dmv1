/**
 * Safe File Writer — atomic writes + in-process mutex.
 *
 * Prevents catalogue.json corruption from concurrent writes.
 * Uses write-to-temp-then-rename pattern (atomic on POSIX).
 * AsyncMutex serializes access within a single Next.js process.
 */

import fs from 'fs/promises';
import path from 'path';

/* ── AsyncMutex ─────────────────────────────────────────────────── */

type Release = () => void;

class AsyncMutex {
  private _queue: Array<(release: Release) => void> = [];
  private _locked = false;

  acquire(): Promise<Release> {
    return new Promise<Release>((resolve) => {
      const tryAcquire = () => {
        if (!this._locked) {
          this._locked = true;
          resolve(() => {
            this._locked = false;
            const next = this._queue.shift();
            if (next) next(tryAcquire as unknown as Release);
          });
        }
      };

      if (!this._locked) {
        tryAcquire();
      } else {
        this._queue.push(() => tryAcquire());
      }
    });
  }
}

/* ── Module-level locks (one per logical file) ──────────────────── */

const locks = new Map<string, AsyncMutex>();

function getLock(filePath: string): AsyncMutex {
  const key = path.resolve(filePath);
  let lock = locks.get(key);
  if (!lock) {
    lock = new AsyncMutex();
    locks.set(key, lock);
  }
  return lock;
}

/* ── Atomic Write ───────────────────────────────────────────────── */

/**
 * Atomically write JSON to a file.
 * 1. Write to a .tmp file
 * 2. Rename .tmp → target (atomic on POSIX)
 * This prevents partial reads if the process crashes mid-write.
 */
export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const resolved = path.resolve(filePath);
  const tmpPath = `${resolved}.${Date.now()}.${process.pid}.tmp`;

  try {
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpPath, resolved);
  } catch (err) {
    // Clean up temp file on failure
    try {
      await fs.unlink(tmpPath);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Read, modify, and atomically write a JSON file with mutex protection.
 * Prevents concurrent read-modify-write races.
 *
 * @param filePath  Path to the JSON file
 * @param modifier  Function that receives current data and returns updated data
 * @returns         The updated data
 */
export async function withLockedJsonFile<T>(
  filePath: string,
  modifier: (current: T) => T | Promise<T>,
): Promise<T> {
  const lock = getLock(filePath);
  const release = await lock.acquire();

  try {
    // Read current
    let current: T;
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      current = JSON.parse(raw) as T;
    } catch {
      current = [] as unknown as T;
    }

    // Modify
    const updated = await modifier(current);

    // Write atomically
    await atomicWriteJson(filePath, updated);

    return updated;
  } finally {
    release();
  }
}
