import { BookOpenCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Instruction Manual"
        description="How to use Talliofi from setup to recurring monthly planning."
        eyebrow="Help"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="size-5 text-primary" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Go to Onboarding and create your first plan.</p>
          <p>2. Set income and taxes so monthly net income is accurate.</p>
          <p>3. Create buckets (for example Essentials, Lifestyle, Savings).</p>
          <p>4. Add recurring expenses and assign each to a bucket.</p>
          <p>5. Review Dashboard and Reports to check spending vs targets.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Add new transactions in Expenses.</p>
          <p>2. Use filters and search to find/edit existing entries.</p>
          <p>3. Track goals progress in Goals and update amounts.</p>
          <p>4. Update assets and liabilities in Net Worth as values change.</p>
          <p>5. Check History snapshots to monitor long-term trends.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reports and Planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Use Reports to analyze spending categories, income vs expenses,
            budget adherence, category trends, and top expenses.
          </p>
          <p>
            Pick date presets or custom ranges, then export reports as CSV/PDF
            for sharing or review.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Go to Settings &gt; Demo Tools to load sample data and explore the
            app with pre-populated information.
          </p>
          <p>
            Use Demo Tools to choose a demo preset, reset demo data, or remove
            it when you are done.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
