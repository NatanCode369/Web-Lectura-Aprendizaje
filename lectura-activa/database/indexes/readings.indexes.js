db.readings.createIndex({ institutionId: 1, status: 1, updatedAt: -1 });
db.readings.createIndex({ institutionId: 1, status: 1, difficulty: 1 });
db.readings.createIndex({ institutionId: 1, status: 1, estimatedMinutes: 1 });