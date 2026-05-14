import { SignJWT, jwtVerify } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret.length === 0) {
    console.warn('JWT_SECRET_KEY is not set. Using a fallback secret. Do NOT use in production!');
    return 'fallback-secret-do-not-use-in-production';
  }
  return secret;
};

export const signToken = async (payload: any) => {
  try {
    const secret = new TextEncoder().encode(getJwtSecretKey());
    const alg = 'HS256';

    return new SignJWT(payload)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('1d') // 1 day
      .sign(secret);
  } catch (error) {
    throw new Error('Failed to sign token');
  }
};

export const verifyToken = async (token: string) => {
  try {
    const secret = new TextEncoder().encode(getJwtSecretKey());
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
};
