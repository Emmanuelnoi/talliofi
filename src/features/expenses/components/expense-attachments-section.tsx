import type { ChangeEvent } from 'react';
import { Paperclip } from 'lucide-react';
import type { ExpenseAttachment } from '@/domain/plan';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatFileSize } from '../utils/date-utils';

interface ExpenseAttachmentsSectionProps {
  visibleExistingAttachments: ExpenseAttachment[];
  newAttachments: File[];
  onAddAttachments: (event: ChangeEvent<HTMLInputElement>) => void;
  onViewAttachment: (blob: Blob, name: string) => void;
  onRemoveExistingAttachment: (id: string) => void;
  onRemoveNewAttachment: (index: number) => void;
}

export function ExpenseAttachmentsSection({
  visibleExistingAttachments,
  newAttachments,
  onAddAttachments,
  onViewAttachment,
  onRemoveExistingAttachment,
  onRemoveNewAttachment,
}: ExpenseAttachmentsSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="expense-attachments">Receipts & attachments</Label>
      <input
        id="expense-attachments"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
        multiple
        onChange={onAddAttachments}
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
        aria-label="Add receipt or attachment files"
      />
      {visibleExistingAttachments.length === 0 &&
        newAttachments.length === 0 && (
          <p className="text-muted-foreground text-xs">
            Add receipts, invoices, or supporting documents.
          </p>
        )}
      {(visibleExistingAttachments.length > 0 || newAttachments.length > 0) && (
        <div className="space-y-2">
          {visibleExistingAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="text-muted-foreground size-4" />
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {attachment.fileName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatFileSize(attachment.size)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onViewAttachment(attachment.blob, attachment.fileName)
                  }
                >
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveExistingAttachment(attachment.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {newAttachments.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="text-muted-foreground size-4" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{file.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onRemoveNewAttachment(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
