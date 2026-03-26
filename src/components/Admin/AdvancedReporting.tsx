import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickBooksReporting } from './QuickBooksReporting';
import { SalesReports } from './Reports/SalesReports';
import { StaffPerformanceReports } from './Reports/StaffPerformanceReports';
import { CustomerInsightsReports } from './Reports/CustomerInsightsReports';
import { FinancialReports } from './Reports/FinancialReports';
import { ItemSummaryReport } from '@/components/Manager/Reports/ItemSummaryReport';
import { VoidedItemsReport } from '@/components/Manager/Reports/VoidedItemsReport';
import { InventoryClosingStock } from '@/components/Manager/Reports/InventoryClosingStock';
import { BarChart, DollarSign, Archive, Users, MessageSquare, FileBarChart, TrendingUp, ShoppingBag, XCircle } from 'lucide-react';

export function AdvancedReporting() {
  const [activeTab, setActiveTab] = useState('financial');

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-8 min-w-max">
                <TabsTrigger value="financial">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Financial
                </TabsTrigger>
                <TabsTrigger value="sales">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="item-summary">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Items
                </TabsTrigger>
                <TabsTrigger value="voids">
                  <XCircle className="h-4 w-4 mr-2" />
                  Voids
                </TabsTrigger>
                <TabsTrigger value="closing-stock">
                  <Archive className="h-4 w-4 mr-2" />
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
            </div>

            {/* Only render the active tab — prevents all 8 components from
                mounting simultaneously and flooding the backend with requests */}
            <TabsContent value="financial" className="space-y-4">
              {activeTab === 'financial' && <FinancialReports />}
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              {activeTab === 'sales' && <SalesReports />}
            </TabsContent>

            <TabsContent value="item-summary" className="space-y-4">
              {activeTab === 'item-summary' && <ItemSummaryReport />}
            </TabsContent>

            <TabsContent value="voids" className="space-y-4">
              {activeTab === 'voids' && <VoidedItemsReport />}
            </TabsContent>

            <TabsContent value="closing-stock" className="space-y-4">
              {activeTab === 'closing-stock' && <InventoryClosingStock />}
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              {activeTab === 'staff' && <StaffPerformanceReports />}
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              {activeTab === 'customers' && <CustomerInsightsReports />}
            </TabsContent>

            <TabsContent value="quickbooks" className="space-y-4">
              {activeTab === 'quickbooks' && <QuickBooksReporting />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
