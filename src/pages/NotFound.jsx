import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileQuestion, Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icon */}
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <FileQuestion className="h-16 w-16 text-blue-600 dark:text-blue-500" />
            </div>

            {/* Error code */}
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
                404
              </h1>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                Page Not Found
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Oops! The page you're looking for doesn't exist.
              </p>
            </div>

            {/* Description */}
            <div className="text-sm text-muted-foreground max-w-sm">
              The page might have been moved, deleted, or the URL might be incorrect.
              Please check the address and try again.
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>

              <Button
                asChild
                className="flex-1"
              >
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
            </div>

            {/* Popular pages */}
            <div className="w-full pt-6 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Try one of these pages instead:
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  to="/menu"
                  className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Browse Menu
                </Link>
                <Link
                  to="/rooms"
                  className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Book a Room
                </Link>
                <Link
                  to="/login"
                  className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Login
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
