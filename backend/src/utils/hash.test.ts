import { burnPasswordCheck, hashPassword, verifyPassword } from './hash';

describe('password hashing', () => {
  it('verifies the original password and rejects others', async () => {
    const hash = await hashPassword('Passw0rd!');
    expect(hash).not.toContain('Passw0rd!');
    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword('Passw0rd!', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('burnPasswordCheck always resolves false', async () => {
    await expect(burnPasswordCheck('anything')).resolves.toBe(false);
  });
});
