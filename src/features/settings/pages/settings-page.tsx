import { PageHeader } from '@/components/layout/page-header';
import { ThemeSection } from '../components/theme-section';
import { CurrencySection } from '../components/currency-section';
import { ExportSection } from '../components/export-section';
import { ImportSection } from '../components/import-section';
import { ImportTransactionsSection } from '../components/import-transactions-section';
import { SyncSection } from '../components/sync-section';
import { MfaSection } from '../components/mfa-section';
import { BrowserSecuritySection } from '../components/browser-security-section';
import { PrivacySection } from '../components/privacy-section';
import { DangerZone } from '../components/danger-zone';
import { ActivityHistorySection } from '../components/activity-history-section';
import { LocalEncryptionSection } from '../components/local-encryption-section';
import { DemoToolsSection } from '../components/demo-tools-section';
import { ManualSection } from '../components/manual-section';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your preferences and data."
        eyebrow="Preferences"
      />
      <ThemeSection />
      <CurrencySection />
      <SyncSection />
      <MfaSection />
      <BrowserSecuritySection />
      <LocalEncryptionSection />
      <ExportSection />
      <ImportSection />
      <ImportTransactionsSection />
      <PrivacySection />
      <ManualSection />
      <DemoToolsSection />
      <ActivityHistorySection />
      <DangerZone />
    </div>
  );
}
