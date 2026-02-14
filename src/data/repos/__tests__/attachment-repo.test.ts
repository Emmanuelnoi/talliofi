import { describe, it, expect } from 'vitest';
import type { ExpenseAttachment } from '@/domain/plan/types';
import { attachmentRepo } from '../attachment-repo';

// PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)
const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
]);

// JPEG magic bytes (FF D8 FF)
const JPEG_HEADER = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

// PDF magic bytes (%PDF)
const PDF_HEADER = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0, 0, 0, 0, 0,
]);

// WebP magic bytes (RIFF....WEBP)
const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0, 0,
  0, 0,
]);

function makeValidAttachment(
  overrides: Partial<ExpenseAttachment> = {},
): ExpenseAttachment {
  return {
    id: crypto.randomUUID(),
    planId: crypto.randomUUID(),
    expenseId: crypto.randomUUID(),
    fileName: 'receipt.png',
    mimeType: 'image/png',
    size: 1024,
    blob: new Blob([PNG_HEADER], { type: 'image/png' }),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('attachmentRepo', () => {
  describe('create()', () => {
    it('creates and returns a valid PNG attachment', async () => {
      const attachment = makeValidAttachment();
      const created = await attachmentRepo.create(attachment);

      expect(created.id).toBe(attachment.id);
      expect(created.fileName).toBe('receipt.png');
    });

    it('creates a valid JPEG attachment', async () => {
      const attachment = makeValidAttachment({
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        blob: new Blob([JPEG_HEADER], { type: 'image/jpeg' }),
      });
      const created = await attachmentRepo.create(attachment);
      expect(created.fileName).toBe('photo.jpg');
    });

    it('creates a valid PDF attachment', async () => {
      const attachment = makeValidAttachment({
        fileName: 'invoice.pdf',
        mimeType: 'application/pdf',
        blob: new Blob([PDF_HEADER], { type: 'application/pdf' }),
      });
      const created = await attachmentRepo.create(attachment);
      expect(created.fileName).toBe('invoice.pdf');
    });

    it('creates a valid WebP attachment', async () => {
      const attachment = makeValidAttachment({
        fileName: 'image.webp',
        mimeType: 'image/webp',
        blob: new Blob([WEBP_HEADER], { type: 'image/webp' }),
      });
      const created = await attachmentRepo.create(attachment);
      expect(created.fileName).toBe('image.webp');
    });

    it('rejects files exceeding 10MB', async () => {
      const attachment = makeValidAttachment({
        size: 11 * 1024 * 1024,
      });
      await expect(attachmentRepo.create(attachment)).rejects.toThrow(
        'exceeds the 10MB limit',
      );
    });

    it('rejects unsupported MIME types', async () => {
      const attachment = makeValidAttachment({
        fileName: 'script.js',
        mimeType: 'application/javascript',
      });
      await expect(attachmentRepo.create(attachment)).rejects.toThrow(
        'unsupported file type',
      );
    });

    it('rejects mismatched extension and MIME type', async () => {
      const attachment = makeValidAttachment({
        fileName: 'receipt.pdf',
        mimeType: 'image/png',
        blob: new Blob([PNG_HEADER], { type: 'image/png' }),
      });
      await expect(attachmentRepo.create(attachment)).rejects.toThrow(
        'invalid file extension',
      );
    });

    it('rejects files whose magic bytes do not match declared MIME type', async () => {
      const attachment = makeValidAttachment({
        fileName: 'fake.png',
        mimeType: 'image/png',
        blob: new Blob([JPEG_HEADER], { type: 'image/png' }),
      });
      await expect(attachmentRepo.create(attachment)).rejects.toThrow(
        'does not match its declared type',
      );
    });

    it('throws on Zod validation failure', async () => {
      const invalid = {
        id: 'bad',
        planId: 'bad',
        expenseId: 'bad',
        fileName: '',
        mimeType: '',
        size: -1,
        blob: 'not-a-blob',
        createdAt: 'invalid',
      } as unknown as ExpenseAttachment;

      await expect(attachmentRepo.create(invalid)).rejects.toThrow();
    });
  });

  describe('getByExpenseId()', () => {
    it('returns attachments for an expense', async () => {
      const expenseId = crypto.randomUUID();
      await attachmentRepo.create(
        makeValidAttachment({ expenseId, fileName: 'a.png' }),
      );
      await attachmentRepo.create(
        makeValidAttachment({ expenseId, fileName: 'b.png' }),
      );

      const result = await attachmentRepo.getByExpenseId(expenseId);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no attachments match', async () => {
      const result = await attachmentRepo.getByExpenseId(crypto.randomUUID());
      expect(result).toHaveLength(0);
    });
  });

  describe('bulkCreate()', () => {
    it('creates multiple attachments', async () => {
      const expenseId = crypto.randomUUID();
      const attachments = [
        makeValidAttachment({ expenseId, fileName: 'one.png' }),
        makeValidAttachment({ expenseId, fileName: 'two.png' }),
      ];

      const result = await attachmentRepo.bulkCreate(attachments);
      expect(result).toHaveLength(2);

      const stored = await attachmentRepo.getByExpenseId(expenseId);
      expect(stored).toHaveLength(2);
    });

    it('returns empty array for empty input', async () => {
      const result = await attachmentRepo.bulkCreate([]);
      expect(result).toHaveLength(0);
    });

    it('rejects if any attachment fails validation', async () => {
      const attachments = [
        makeValidAttachment(),
        makeValidAttachment({
          fileName: 'bad.exe',
          mimeType: 'application/x-msdownload',
        }),
      ];
      await expect(attachmentRepo.bulkCreate(attachments)).rejects.toThrow(
        'unsupported file type',
      );
    });
  });

  describe('delete()', () => {
    it('removes a single attachment', async () => {
      const expenseId = crypto.randomUUID();
      const attachment = makeValidAttachment({ expenseId });
      await attachmentRepo.create(attachment);

      await attachmentRepo.delete(attachment.id);

      const result = await attachmentRepo.getByExpenseId(expenseId);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteByExpenseId()', () => {
    it('removes all attachments for an expense', async () => {
      const expenseId = crypto.randomUUID();
      await attachmentRepo.create(makeValidAttachment({ expenseId }));
      await attachmentRepo.create(makeValidAttachment({ expenseId }));

      await attachmentRepo.deleteByExpenseId(expenseId);

      const result = await attachmentRepo.getByExpenseId(expenseId);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteByExpenseIds()', () => {
    it('removes attachments for multiple expenses', async () => {
      const expenseId1 = crypto.randomUUID();
      const expenseId2 = crypto.randomUUID();
      await attachmentRepo.create(
        makeValidAttachment({ expenseId: expenseId1 }),
      );
      await attachmentRepo.create(
        makeValidAttachment({ expenseId: expenseId2 }),
      );

      await attachmentRepo.deleteByExpenseIds([expenseId1, expenseId2]);

      expect(await attachmentRepo.getByExpenseId(expenseId1)).toHaveLength(0);
      expect(await attachmentRepo.getByExpenseId(expenseId2)).toHaveLength(0);
    });

    it('handles empty array gracefully', async () => {
      await expect(
        attachmentRepo.deleteByExpenseIds([]),
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteByPlanId()', () => {
    it('removes all attachments for a plan', async () => {
      const planId = crypto.randomUUID();
      const expenseId = crypto.randomUUID();
      await attachmentRepo.create(makeValidAttachment({ planId, expenseId }));
      await attachmentRepo.create(makeValidAttachment({ planId, expenseId }));

      await attachmentRepo.deleteByPlanId(planId);

      const result = await attachmentRepo.getByExpenseId(expenseId);
      expect(result).toHaveLength(0);
    });
  });
});
