import { PageHeader } from '@/components/layout/page-header';
import { ThemeSection } from '../components/theme-section';
import { CurrencySection } from '../components/currency-section';
import { ExportSection } from '../components/export-section';
import { ImportSection } from '../components/import-section';
import { ImportTransactionsSection } from '../components/import-transactions-section';
import { SyncSection } from '../components/sync-section';
import { MfaSection } from '../components/mfa-section';
import { PrivacySection } from '../components/privacy-section';
import { DangerZone } from '../components/danger-zone';
import { ActivityHistorySection } from '../components/activity-history-section';
import { LocalEncryptionSection } from '../components/local-encryption-section';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your preferences and data."
      />
      <ThemeSection />
      <CurrencySection />
      <SyncSection />
      <MfaSection />
      <LocalEncryptionSection />
      <ExportSection />
      <ImportSection />
      <ImportTransactionsSection />
      <PrivacySection />
      <ActivityHistorySection />
      <DangerZone />
    </div>
  );
}
