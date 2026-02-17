import { useState } from 'react';
import {
  BadgeCheck,
  BookOpenCheck,
  CalendarClock,
  ChevronDown,
  CircleHelp,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function HelpPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const paycheckChecklist = [
    'Open Dashboard first and check available surplus/deficit.',
    'Go to Income and update current gross income if this paycheck changed.',
    'Go to Taxes and confirm your effective rate or itemized components.',
    'Go to Expenses and add new recurring items or edit changed amounts.',
    'Use categories and buckets consistently so Reports stay accurate.',
    'Review Goals and Net Worth if balances changed this period.',
    'Open Reports for category trends and top expenses before ending the session.',
  ];

  const faq = [
    {
      question: 'Should I create a new plan after every paycheck?',
      answer:
        'No. Keep one main plan and update it every payday. Create a new plan only for a big life change, like a new job or a move.',
    },
    {
      question: 'What happens when I edit existing values?',
      answer:
        'Your budget updates right away, so your dashboard and reports always show your latest numbers.',
    },
    {
      question: 'How do I keep period-by-period history over time?',
      answer:
        'Before a big change, duplicate your plan first. That gives you a simple before-and-after comparison.',
    },
    {
      question: 'How often should I update Talliofi?',
      answer:
        'Best results come from updates every paycheck plus a short weekly cleanup.',
    },
    {
      question: 'Can I track bi-monthly income patterns?',
      answer:
        'Yes. Update Income and Expenses after each paycheck, then use Reports to spot patterns over time.',
    },
    {
      question: 'What should I do when starting a new month?',
      answer:
        'Do a monthly reset: compare reports, tune bucket targets, and clean up old expense entries.',
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Instruction Manual"
        description="A simple routine you can follow after every paycheck to stay in control."
        eyebrow="Help"
      />

      <Card className="border-border/70 bg-gradient-to-br from-background to-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="size-5 text-primary" aria-hidden="true" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Start with Onboarding and create your first plan.</p>
          <p>
            2. Enter income and taxes so your take-home number is realistic.
          </p>
          <p>
            3. Set your buckets (for example Essentials, Lifestyle, Savings).
          </p>
          <p>4. Add recurring expenses and place each one in a bucket.</p>
          <p>5. Check Dashboard and Reports to see if you are on track.</p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" aria-hidden="true" />
            Paycheck Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Every Paycheck</Badge>
            <Badge variant="secondary">10-15 Minutes</Badge>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {paycheckChecklist.map((item, index) => (
              <p key={item}>
                {index + 1}. {item}
              </p>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Tip: even a quick 10-minute update keeps your numbers trustworthy.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
            Cadence That Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">
              Every paycheck:
            </span>{' '}
            Update Income, Taxes, and Expenses, then check Dashboard.
          </p>
          <p>
            <span className="font-semibold text-foreground">
              Weekly quick check:
            </span>{' '}
            Clean up categories and fix anything you missed.
          </p>
          <p>
            <span className="font-semibold text-foreground">
              Monthly review:
            </span>{' '}
            Compare this month to last month and adjust your bucket targets.
          </p>
          <p>
            If you want a clear checkpoint before a major life/budget change,
            duplicate your plan first.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleHelp className="size-5 text-primary" aria-hidden="true" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {faq.map((item, index) => (
            <Collapsible
              key={item.question}
              open={openFaqIndex === index}
              onOpenChange={(open) => {
                setOpenFaqIndex(open ? index : null);
              }}
              className="rounded-lg border border-border/70 bg-muted/20 transition-colors data-[state=open]:bg-muted/35"
            >
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15">
                <span className="group-data-[state=open]:text-primary">
                  {item.question}
                </span>
                <ChevronDown
                  className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary"
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-hidden px-4 pb-4 pt-0">
                <p className="text-muted-foreground">{item.answer}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
