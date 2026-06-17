import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export { schema };

type DB = NeonHttpDatabase<typeof schema>;

// Lazy singleton: the Neon client is only created on first query, so importing
// this module (e.g. during `next build`) never fails when DATABASE_URL is unset.
let instance: DB | null = null;

function init(): DB {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle({ client: sql, schema });
}

export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    if (!instance) instance = init();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
