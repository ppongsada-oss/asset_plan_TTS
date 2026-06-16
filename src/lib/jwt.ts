import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET_KEY || process.env.JWT_TOKEN;
  if (!secret || secret.length === 0) {
    throw new Error('JWT_SECRET_KEY or JWT_TOKEN is not configured');
  }
  return secret;
};

export const signToken = async (payload: JWTPayload) => {
  try {
    const secret = new TextEncoder().encode(getJwtSecretKey());
    const alg = 'HS256';

    return new SignJWT(payload)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('1d') // 1 day
      .sign(secret);
  } catch {
    throw new Error('Failed to sign token');
  }
};

export const verifyToken = async (token: string) => {
  try {
    const secret = new TextEncoder().encode(getJwtSecretKey());
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
};
