import { customAlphabet } from "nanoid";

/** URL-safe, human-readable 21-char IDs */
const generate = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 21);

export function generateId(prefix?: string): string {
  const id = generate();
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Converts an arbitrary string into a stable, slug-like ID component.
 * Useful for deriving node IDs from labels during normalisation.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}
