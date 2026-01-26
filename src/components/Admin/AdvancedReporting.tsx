import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickBooksReporting } from './QuickBooksReporting';
import { SalesReports } from './Reports/SalesReports';
import { InventoryReports } from './Reports/InventoryReports';
import { StaffPerformanceReports } from './Reports/StaffPerformanceReports';
import { CustomerInsightsReports } from './Reports/CustomerInsightsReports';
import { BarChart, DollarSign, Package, Users, MessageSquare, FileBarChart } from 'lucide-react';

export function AdvancedReporting() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive business intelligence and analytics dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="sales">
                <DollarSign className="h-4 w-4 mr-2" />
                Sales
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <Package className="h-4 w-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="staff">
                <Users className="h-4 w-4 mr-2" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="customers">
                <MessageSquare className="h-4 w-4 mr-2" />
                Customers
              </TabsTrigger>
              <TabsTrigger value="quickbooks">
                <FileBarChart className="h-4 w-4 mr-2" />
                QuickBooks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
              <SalesReports />
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <InventoryReports />
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              <StaffPerformanceReports />
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <CustomerInsightsReports />
            </TabsContent>

            <TabsContent value="quickbooks" className="space-y-4">
              <QuickBooksReporting />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
