import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PrivacySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-surplus" />
          Privacy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span
              className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-surplus"
              aria-hidden="true"
            />
            All data is stored locally on your device.
          </li>
          <li className="flex items-start gap-2">
            <span
              className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-surplus"
              aria-hidden="true"
            />
            No tracking, analytics, or third-party scripts.
          </li>
          <li className="flex items-start gap-2">
            <span
              className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-surplus"
              aria-hidden="true"
            />
            You control your data — export or delete anytime.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
