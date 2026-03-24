/**
 * Safe collection utilities — defensive helpers that throw with context
 * instead of crashing with cryptic "Cannot read property of undefined".
 */

/**
 * Push an item to a Map<string, T[]> entry, throwing with context if the key is missing.
 */
export function safePush<T>(
  map: Map<string, T[]>,
  key: string,
  item: T,
  context?: string,
): void {
  const arr = map.get(key);
  if (!arr) {
    throw new Error(
      `safePush: key "${key}" not found in Map${context ? ` (${context})` : ''}. ` +
      `Available keys: [${[...map.keys()].slice(0, 10).join(', ')}${map.size > 10 ? '...' : ''}]`,
    );
  }
  arr.push(item);
}

/**
 * Get a value from a Map, throwing with context if the key is missing.
 */
export function safeGet<K, V>(
  map: Map<K, V>,
  key: K,
  context?: string,
): V {
  const val = map.get(key);
  if (val === undefined) {
    throw new Error(
      `safeGet: key "${String(key)}" not found in Map${context ? ` (${context})` : ''}`,
    );
  }
  return val;
}
