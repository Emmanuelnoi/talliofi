import { BookOpen, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ManualSection() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          User Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          New users can follow a step-by-step walkthrough of onboarding,
          tracking expenses, reviewing reports, and managing plans.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate('/help')}
          >
            Open Instruction Manual
            <ExternalLink className="size-4" />
          </Button>
          <Button variant="ghost" asChild className="gap-2">
            <a href="/USER_MANUAL.md" target="_blank" rel="noreferrer">
              Open Markdown Guide
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
