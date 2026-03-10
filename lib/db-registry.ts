/**
 * Database registry: defines which PostgreSQL databases are available
 * for the db-status dashboard. Add new entries here to make them
 * selectable in the dropdown.
 */

export interface DatabaseEntry {
  id: string;       // URL-safe key, used in ?db= param
  label: string;    // Human-readable label for the dropdown
  envVar: string;   // Name of the env var holding the connection string
}

const ALL_DATABASES: DatabaseEntry[] = [
  { id: 'credit',  label: 'Credit',  envVar: 'DATABASE_URL' },
  { id: 'capital', label: 'Capital', envVar: 'CAPITAL_DATABASE_URL' },
];

/** Return only databases whose env var is set (non-empty). */
export function getAvailableDatabases(): DatabaseEntry[] {
  return ALL_DATABASES.filter((db) => !!process.env[db.envVar]);
}

/** Look up a database by id. Returns undefined if not found or env var not set. */
export function getDatabaseEntry(id: string): DatabaseEntry | undefined {
  const entry = ALL_DATABASES.find((db) => db.id === id);
  if (!entry || !process.env[entry.envVar]) return undefined;
  return entry;
}

/** Resolve a database connection string from an entry. */
export function getDatabaseUrl(entry: DatabaseEntry): string | undefined {
  return process.env[entry.envVar] || undefined;
}
