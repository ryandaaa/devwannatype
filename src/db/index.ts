import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:devwannatype.db";

let dbPromise: Promise<Database> | null = null;

/**
 * Singleton DB instance. Migrations dijalankan oleh tauri-plugin-sql
 * berdasarkan deklarasi di src-tauri/src/lib.rs.
 */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}
