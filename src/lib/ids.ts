import { randomUUID } from "crypto";

/** Generates a unique id for a new row. */
export function newId(): string {
  return randomUUID();
}
