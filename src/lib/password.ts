const LEGACY_SALT = "asset_plan_secure_salt_2026_xyz";
const PBKDF2_PREFIX = "pbkdf2";
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (value: string) => {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    bytes[i / 2] = parseInt(value.slice(i, i + 2), 16);
  }
  return bytes;
};

const derivePbkdf2Hash = async (password: string, salt: Uint8Array, iterations: number) => {
  const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations,
    },
    key,
    HASH_BYTES * 8
  );

  return new Uint8Array(bits);
};

const hashLegacyPassword = async (password: string) => {
  const data = encoder.encode(password + LEGACY_SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(hashBuffer));
};

const hashPbkdf2Password = async (password: string) => {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const derived = await derivePbkdf2Hash(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
};

const parsePbkdf2Iterations = (hash: string) => {
  if (!hash.startsWith(`${PBKDF2_PREFIX}$`)) {
    return null;
  }

  const [, iterationText] = hash.split("$");
  const iterations = parseInt(iterationText, 10);
  return Number.isFinite(iterations) && iterations > 0 ? iterations : null;
};

const verifyPbkdf2Password = async (password: string, storedHash: string) => {
  const [, iterationText, saltHex, hashHex] = storedHash.split("$");
  const iterations = parseInt(iterationText, 10);
  if (!iterations || !saltHex || !hashHex) {
    return false;
  }

  const expected = await derivePbkdf2Hash(password, fromHex(saltHex), iterations);
  return toHex(expected) === hashHex;
};

export const hashPassword = async (password: string) => hashPbkdf2Password(password);

export const getPasswordTokenFingerprint = async (hash: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(hash));
  return toHex(new Uint8Array(digest)).slice(0, 24);
};

export const comparePassword = async (password: string, hash: string) => {
  if (hash.startsWith(`${PBKDF2_PREFIX}$`)) {
    return verifyPbkdf2Password(password, hash);
  }

  const expectedHash = await hashLegacyPassword(password);
  return expectedHash === hash;
};

export const needsPasswordRehash = (hash: string) => {
  const iterations = parsePbkdf2Iterations(hash);
  if (!iterations) {
    return true;
  }

  return iterations !== PBKDF2_ITERATIONS;
};
