import { db } from '../db';
import type { ExpenseAttachment } from '@/domain/plan/types';
import { ExpenseAttachmentSchema } from '@/domain/plan/schemas';
import { handleDexieWriteError } from './handle-dexie-error';
import type { ReadRepository } from './types';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

const MIME_TO_EXTENSIONS: Record<string, readonly string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

function getFileExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? '';
}

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

function matchesMagicSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mimeType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  if (mimeType === 'application/pdf') {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    );
  }

  return false;
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;
const PATH_SEPARATORS = /[/\\]/g;
const CONSECUTIVE_DOTS = /\.{2,}/g;
const MAX_FILENAME_LENGTH = 255;

function sanitizeFilename(name: string): string {
  return name
    .replace(PATH_SEPARATORS, '_')
    .replace(CONTROL_CHARS, '')
    .replace(CONSECUTIVE_DOTS, '.')
    .trim()
    .slice(0, MAX_FILENAME_LENGTH);
}

async function validateAttachmentConstraints(
  attachment: ExpenseAttachment,
): Promise<void> {
  if (attachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(
      `"${attachment.fileName}" exceeds the 10MB limit. Choose a smaller file.`,
    );
  }

  const normalizedMimeType = attachment.mimeType.toLowerCase();
  if (!isAllowedMimeType(normalizedMimeType)) {
    throw new Error(
      `"${attachment.fileName}" has an unsupported file type. Only PNG, JPEG, WEBP, and PDF files are allowed.`,
    );
  }

  const extension = getFileExtension(attachment.fileName);
  const allowedExtensions = MIME_TO_EXTENSIONS[normalizedMimeType];
  if (!allowedExtensions?.includes(extension)) {
    throw new Error(
      `"${attachment.fileName}" has an invalid file extension for its file type.`,
    );
  }

  const headerBytes = new Uint8Array(
    await attachment.blob.slice(0, 16).arrayBuffer(),
  );
  if (!matchesMagicSignature(normalizedMimeType, headerBytes)) {
    throw new Error(
      `"${attachment.fileName}" file content does not match its declared type.`,
    );
  }
}

export const attachmentRepo = {
  async getByExpenseId(expenseId: string): Promise<ExpenseAttachment[]> {
    return db.attachments.where('expenseId').equals(expenseId).toArray();
  },

  async create(attachment: ExpenseAttachment): Promise<ExpenseAttachment> {
    const sanitized = {
      ...attachment,
      fileName: sanitizeFilename(attachment.fileName),
    };
    const validated = ExpenseAttachmentSchema.parse(
      sanitized,
    ) as ExpenseAttachment;
    await validateAttachmentConstraints(validated);
    try {
      await db.attachments.add(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Attachment', attachment.id);
    }
    return validated;
  },

  async bulkCreate(
    attachments: ExpenseAttachment[],
  ): Promise<ExpenseAttachment[]> {
    if (attachments.length === 0) return [];
    const validated = attachments.map((attachment) => {
      const sanitized = {
        ...attachment,
        fileName: sanitizeFilename(attachment.fileName),
      };
      return ExpenseAttachmentSchema.parse(sanitized);
    }) as ExpenseAttachment[];
    for (const attachment of validated) {
      await validateAttachmentConstraints(attachment);
    }
    try {
      await db.attachments.bulkAdd(validated);
    } catch (error) {
      handleDexieWriteError(error, 'Attachment');
    }
    return validated;
  },

  async delete(id: string): Promise<void> {
    await db.attachments.delete(id);
  },

  async deleteByExpenseId(expenseId: string): Promise<void> {
    await db.attachments.where('expenseId').equals(expenseId).delete();
  },

  async countByExpenseIds(expenseIds: string[]): Promise<number> {
    if (expenseIds.length === 0) return 0;
    return db.attachments.where('expenseId').anyOf(expenseIds).count();
  },

  async deleteByExpenseIds(expenseIds: string[]): Promise<void> {
    if (expenseIds.length === 0) return;
    await db.attachments.where('expenseId').anyOf(expenseIds).delete();
  },

  async deleteByPlanId(planId: string): Promise<void> {
    await db.attachments.where('planId').equals(planId).delete();
  },
} satisfies Omit<ReadRepository<ExpenseAttachment>, 'getByPlanId'> & {
  getByExpenseId(expenseId: string): Promise<ExpenseAttachment[]>;
  create(attachment: ExpenseAttachment): Promise<ExpenseAttachment>;
  bulkCreate(attachments: ExpenseAttachment[]): Promise<ExpenseAttachment[]>;
  delete(id: string): Promise<void>;
  deleteByExpenseId(expenseId: string): Promise<void>;
  countByExpenseIds(expenseIds: string[]): Promise<number>;
  deleteByExpenseIds(expenseIds: string[]): Promise<void>;
  deleteByPlanId(planId: string): Promise<void>;
};
