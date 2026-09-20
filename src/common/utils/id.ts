import crypto from 'node:crypto';

/** Compact unique id (cuid-like) for primary keys */
export function createId(): string {
  return `c${Date.now().toString(36)}${crypto.randomBytes(6).toString('hex')}`;
}
