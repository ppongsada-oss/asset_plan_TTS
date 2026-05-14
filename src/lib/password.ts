const SALT = "asset_plan_secure_salt_2026_xyz";

export const hashPassword = async (password: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

export const comparePassword = async (password: string, hash: string) => {
  const expectedHash = await hashPassword(password);
  return expectedHash === hash;
};
