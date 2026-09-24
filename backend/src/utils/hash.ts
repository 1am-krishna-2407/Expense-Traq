import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { env } from '../config/env';

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, env.BCRYPT_COST);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

let dummyHash: Promise<string> | null = null;

/**
 * Runs a bcrypt comparison against a throwaway hash. Login calls this when the email is
 * unknown so the response time doesn't reveal whether an account exists.
 */
export async function burnPasswordCheck(plain: string): Promise<false> {
  dummyHash ??= hashPassword(crypto.randomBytes(16).toString('hex'));
  await bcrypt.compare(plain, await dummyHash);
  return false;
}
