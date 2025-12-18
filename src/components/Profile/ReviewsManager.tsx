import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

export default function ReviewsManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          My Reviews
        </CardTitle>
        <CardDescription>Manage your reviews</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Your reviews will appear here</p>
      </CardContent>
    </Card>
  );
}
