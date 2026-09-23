import bcrypt from "bcryptjs";

export const DEFAULT_BCRYPT_ROUNDS = 12;

export function validatePasswordStrength(password: string, minimumLength = 10): void {
  if (password.length < minimumLength) {
    throw new Error(`Password must be at least ${minimumLength} characters long.`);
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must include at least one letter and one number.");
  }
}

export async function hashPassword(password: string, rounds = DEFAULT_BCRYPT_ROUNDS): Promise<string> {
  validatePasswordStrength(password);
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
