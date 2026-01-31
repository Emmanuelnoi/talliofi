import { PageHeader } from '@/components/layout/page-header';

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and manage your recurring expenses."
      />
    </div>
  );
}
