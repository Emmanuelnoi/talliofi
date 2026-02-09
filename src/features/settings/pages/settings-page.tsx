import { PageHeader } from '@/components/layout/page-header';
import { ThemeSection } from '../components/theme-section';
import { ExportSection } from '../components/export-section';
import { ImportSection } from '../components/import-section';
import { ImportTransactionsSection } from '../components/import-transactions-section';
import { SyncSection } from '../components/sync-section';
import { PrivacySection } from '../components/privacy-section';
import { DangerZone } from '../components/danger-zone';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your preferences and data."
      />
      <ThemeSection />
      <SyncSection />
      <ExportSection />
      <ImportSection />
      <ImportTransactionsSection />
      <PrivacySection />
      <DangerZone />
    </div>
  );
}
