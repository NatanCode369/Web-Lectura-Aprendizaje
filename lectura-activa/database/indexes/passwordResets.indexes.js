export const collection = 'passwordResets';

export const indexes = [
  {
    key: { tokenHash: 1 },
    name: 'token_hash_unique',
    unique: true
  },
  { key: { email: 1, expiresAt: 1 }, name: 'email_expires' },
  { key: { expiresAt: 1 }, name: 'expires_at_ttl', expireAfterSeconds: 0 }
];