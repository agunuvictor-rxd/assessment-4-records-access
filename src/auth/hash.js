import * as argon2 from '@node-rs/argon2';

/**
 * Hashes a plaintext password using Argon2id.
 * Parameters follow OWASP recommendations:
 * - memoryCost: 65536 KB (64 MB) — memory-hard to resist GPU attacks
 * - timeCost: 3 iterations — slows brute-force
 * - parallelism: 1 — single-threaded per hash
 */
export async function hashPassword(password) {
  return argon2.hash(password, {
    algorithm: argon2.Algorithm.Argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    return false;
  }
}
