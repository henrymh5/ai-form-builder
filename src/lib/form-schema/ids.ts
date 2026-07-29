import { customAlphabet } from "nanoid";

/**
 * Typed ID generation for the canonical form schema (plan §4.1).
 * IDs are generated exclusively here — never by the AI, never blindly
 * copied when duplicating a form/page/field (plan §6).
 *
 * Alphabet excludes visually ambiguous characters (0/O, 1/l/I) since IDs
 * may appear in URLs, logs, and support conversations.
 */
const nanoid = customAlphabet("23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", 12);

export const ID_PREFIXES = {
  page: "pg_",
  field: "fld_",
  option: "opt_",
  condition: "cnd_",
  ending: "end_",
} as const;

export type IdKind = keyof typeof ID_PREFIXES;

export function generateId(kind: IdKind): string {
  return `${ID_PREFIXES[kind]}${nanoid()}`;
}

const ID_PATTERN_BY_KIND: Record<IdKind, RegExp> = {
  page: /^pg_[a-zA-Z2-9]{12}$/,
  field: /^fld_[a-zA-Z2-9]{12}$/,
  option: /^opt_[a-zA-Z2-9]{12}$/,
  condition: /^cnd_[a-zA-Z2-9]{12}$/,
  ending: /^end_[a-zA-Z2-9]{12}$/,
};

export function isValidId(kind: IdKind, value: string): boolean {
  return ID_PATTERN_BY_KIND[kind].test(value);
}
