import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Download } from 'lucide-react';
import { Button } from './ui/button';

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function ChartCard({ title, description, children, action }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action || (
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[300px]">{children}</div>
      </CardContent>
    </Card>
  );
}