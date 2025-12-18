import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';

export default function LoyaltyProgram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Loyalty Program
        </CardTitle>
        <CardDescription>Loyalty program features coming soon</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Earn points and redeem rewards - under development</p>
      </CardContent>
    </Card>
  );
}
