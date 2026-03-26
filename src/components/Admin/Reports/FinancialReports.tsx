import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-10">
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

      <TabsContent value="sales">{activeTab === 'sales' && <ComprehensiveSalesReports />}</TabsContent>
      <TabsContent value="pl">{activeTab === 'pl' && <ProfitLossStatement />}</TabsContent>
      <TabsContent value="balance">{activeTab === 'balance' && <BalanceSheet />}</TabsContent>
      <TabsContent value="cashflow">{activeTab === 'cashflow' && <CashFlowReport />}</TabsContent>
      <TabsContent value="vat">{activeTab === 'vat' && <VATReport />}</TabsContent>
      <TabsContent value="compare">{activeTab === 'compare' && <ComparativeAnalysis />}</TabsContent>
      <TabsContent value="inventory">{activeTab === 'inventory' && <InventoryClosingStock />}</TabsContent>
      <TabsContent value="occupancy">{activeTab === 'occupancy' && <OccupancyReport />}</TabsContent>
      <TabsContent value="menu">{activeTab === 'menu' && <MenuProfitabilityReport />}</TabsContent>
      <TabsContent value="clv">{activeTab === 'clv' && <CustomerLifetimeValueReport />}</TabsContent>
    </Tabs>
  );
}
