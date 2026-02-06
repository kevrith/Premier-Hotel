import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComprehensiveSalesReports } from '@/components/Manager/Reports/ComprehensiveSalesReports';
import { ProfitLossStatement } from '@/components/Manager/Reports/ProfitLossStatement';
import { BalanceSheet } from '@/components/Manager/Reports/BalanceSheet';
import { CashFlowReport } from '@/components/Manager/Reports/CashFlowReport';
import { VATReport } from '@/components/Manager/Reports/VATReport';
import { ComparativeAnalysis } from '@/components/Manager/Reports/ComparativeAnalysis';
import { InventoryClosingStock } from '@/components/Manager/Reports/InventoryClosingStock';
import { OccupancyReport } from '@/components/Manager/Reports/OccupancyReport';
import { MenuProfitabilityReport } from '@/components/Manager/Reports/MenuProfitabilityReport';
import { CustomerLifetimeValueReport } from '@/components/Manager/Reports/CustomerLifetimeValueReport';

export function FinancialReports() {
  return (
    <Tabs defaultValue="sales" className="space-y-4">
      <TabsList className="grid w-full grid-cols-11">
        <TabsTrigger value="sales">Sales</TabsTrigger>
        <TabsTrigger value="pl">P&L</TabsTrigger>
        <TabsTrigger value="balance">Balance</TabsTrigger>
        <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        <TabsTrigger value="vat">VAT</TabsTrigger>
        <TabsTrigger value="compare">Compare</TabsTrigger>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
        <TabsTrigger value="menu">Menu Profit</TabsTrigger>
        <TabsTrigger value="clv">Customer CLV</TabsTrigger>
      </TabsList>

      <TabsContent value="sales">
        <ComprehensiveSalesReports />
      </TabsContent>

      <TabsContent value="pl">
        <ProfitLossStatement />
      </TabsContent>

      <TabsContent value="balance">
        <BalanceSheet />
      </TabsContent>

      <TabsContent value="cashflow">
        <CashFlowReport />
      </TabsContent>

      <TabsContent value="vat">
        <VATReport />
      </TabsContent>

      <TabsContent value="compare">
        <ComparativeAnalysis />
      </TabsContent>

      <TabsContent value="inventory">
        <InventoryClosingStock />
      </TabsContent>

      <TabsContent value="occupancy">
        <OccupancyReport />
      </TabsContent>

      <TabsContent value="menu">
        <MenuProfitabilityReport />
      </TabsContent>

      <TabsContent value="clv">
        <CustomerLifetimeValueReport />
      </TabsContent>
    </Tabs>
  );
}
