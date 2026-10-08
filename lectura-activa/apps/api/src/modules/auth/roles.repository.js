/**
 * Repositorio de whitelists: `admins` y `teachers`.
 *
 * Cada colección tiene documentos con `{ email, addedBy, createdAt }`.
 * El email es único.
 */

export function whitelistRepo(db, collectionName) {
  const col = db.collection(collectionName);

  return {
    async isInList(email) {
      if (!email) return false;
      const normalized = String(email).toLowerCase().trim();
      const doc = await col.findOne({ email: normalized });
      return Boolean(doc);
    },

    async findAllEmails() {
      const docs = await col.find({}).project({ email: 1 }).toArray();
      return docs.map((d) => d.email);
    },

    async add(email, addedBy = null) {
      const normalized = String(email).toLowerCase().trim();
      return col.updateOne(
        { email: normalized },
        {
          $setOnInsert: {
            email: normalized,
            addedBy,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    },

    async remove(email) {
      const normalized = String(email).toLowerCase().trim();
      return col.deleteOne({ email: normalized });
    },
  };
}

export function adminsRepo(db) {
  return whitelistRepo(db, 'admins');
}

export function teachersRepo(db) {
  return whitelistRepo(db, 'teachers');
}