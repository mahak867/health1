import bcrypt from 'bcryptjs';

export async function hashText(plainText) {
  return bcrypt.hash(plainText, 12);
}

export async function compareHash(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}
