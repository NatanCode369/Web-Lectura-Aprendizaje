import { describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { buildReadingService } from '../src/modules/readings/reading.service.js';

describe('reading service catalog contract', () => {
  it('always requests published readings scoped to the authenticated institution', async () => {
    const readingRepository = {
      list: vi.fn().mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })
    };

    const service = buildReadingService({
      readingRepository,
      auditRepository: {}
    });

    const institutionId = new ObjectId();

    await service.list(
      { page: 1, limit: 20, search: 'principito', difficulty: 'easy', maxMinutes: 20 },
      { role: 'teacher', institutionId }
    );

    expect(readingRepository.list).toHaveBeenCalledWith({
      institutionId,
      search: 'principito',
      difficulty: 'easy',
      maxMinutes: 20,
      page: 1,
      limit: 20
    });
  });
});
