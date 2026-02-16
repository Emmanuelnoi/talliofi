import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changelogRepo } from '@/data/repos/changelog-repo';
import type { ChangeLogEntry } from '@/domain/plan';
import { useLocalEncryption } from '@/hooks/use-local-encryption';
import { queryKeys } from './query-keys';
import { logger } from '@/lib/logger';

interface EntityWithPlanId {
  id: string;
  planId: string;
  name?: string;
}

interface CrudMutationConfig<T extends EntityWithPlanId> {
  entityType: ChangeLogEntry['entityType'];
  queryKey: (planId: string) => readonly unknown[];
  repo: {
    create: (item: T) => Promise<T>;
    update: (item: T) => Promise<T>;
    delete: (id: string) => Promise<void>;
  };
}

export function useVaultSaveOnSuccess() {
  const { scheduleVaultSave } = useLocalEncryption();
  return scheduleVaultSave;
}

/**
 * Records a change in the changelog for audit/activity tracking.
 * Fire-and-forget: errors are logged but never block the mutation.
 */
export function recordChange(
  planId: string,
  entityType: ChangeLogEntry['entityType'],
  entityId: string,
  operation: ChangeLogEntry['operation'],
  entityName?: string,
): void {
  const entry: ChangeLogEntry = {
    id: crypto.randomUUID(),
    planId,
    entityType,
    entityId,
    operation,
    timestamp: new Date().toISOString(),
    payload: entityName ? JSON.stringify({ name: entityName }) : undefined,
  };
  changelogRepo.create(entry).catch((err: unknown) => {
    logger.error('changelog', 'Failed to record change:', err);
  });
}

export function recordBulkChange(
  planId: string,
  entityType: ChangeLogEntry['entityType'],
  items: Array<{ id: string; name?: string }>,
  operation: ChangeLogEntry['operation'],
): void {
  const entries: ChangeLogEntry[] = items.map((item) => ({
    id: crypto.randomUUID(),
    planId,
    entityType,
    entityId: item.id,
    operation,
    timestamp: new Date().toISOString(),
    payload: item.name ? JSON.stringify({ name: item.name }) : undefined,
  }));
  changelogRepo.bulkCreate(entries).catch((err: unknown) => {
    logger.error('changelog', 'Failed to record bulk change:', err);
  });
}

export function useCreateEntity<T extends EntityWithPlanId>(
  config: CrudMutationConfig<T>,
) {
  const queryClient = useQueryClient();
  const scheduleVaultSave = useVaultSaveOnSuccess();
  return useMutation({
    mutationFn: (item: T) => config.repo.create(item),
    onMutate: async (newItem) => {
      const key = config.queryKey(newItem.planId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<T[]>(key);
      queryClient.setQueryData<T[]>(key, (old = []) => [...old, newItem]);
      return { previous, planId: newItem.planId };
    },
    onError: (_err, _item, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          config.queryKey(context.planId),
          context.previous,
        );
      }
    },
    onSettled: (_data, error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: config.queryKey(variables.planId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.changelog });
      if (!error) {
        scheduleVaultSave();
        recordChange(
          variables.planId,
          config.entityType,
          variables.id,
          'create',
          variables.name,
        );
      }
    },
  });
}

export function useUpdateEntity<T extends EntityWithPlanId>(
  config: CrudMutationConfig<T>,
) {
  const queryClient = useQueryClient();
  const scheduleVaultSave = useVaultSaveOnSuccess();
  return useMutation({
    mutationFn: (item: T) => config.repo.update(item),
    onMutate: async (updatedItem) => {
      const key = config.queryKey(updatedItem.planId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<T[]>(key);
      queryClient.setQueryData<T[]>(key, (old = []) =>
        old.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
      );
      return { previous, planId: updatedItem.planId };
    },
    onError: (_err, _item, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          config.queryKey(context.planId),
          context.previous,
        );
      }
    },
    onSettled: (_data, error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: config.queryKey(variables.planId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.changelog });
      if (!error) {
        scheduleVaultSave();
        recordChange(
          variables.planId,
          config.entityType,
          variables.id,
          'update',
          variables.name,
        );
      }
    },
  });
}

export function useDeleteEntity<T extends EntityWithPlanId>(
  config: CrudMutationConfig<T>,
) {
  const queryClient = useQueryClient();
  const scheduleVaultSave = useVaultSaveOnSuccess();
  return useMutation({
    mutationFn: ({ id }: { id: string; planId: string }) =>
      config.repo.delete(id),
    onMutate: async ({ id, planId }) => {
      const key = config.queryKey(planId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<T[]>(key);
      queryClient.setQueryData<T[]>(key, (old = []) =>
        old.filter((item) => item.id !== id),
      );
      return { previous, planId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          config.queryKey(context.planId),
          context.previous,
        );
      }
    },
    onSettled: (_data, error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: config.queryKey(variables.planId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.changelog });
      if (!error) {
        scheduleVaultSave();
        recordChange(
          variables.planId,
          config.entityType,
          variables.id,
          'delete',
        );
      }
    },
  });
}
