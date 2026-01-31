import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { clearAllData } from '@/data/db';

beforeEach(async () => {
  await clearAllData();
});
