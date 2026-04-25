// @ts-nocheck
import { useState, useEffect, ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UtensilsCrossed, Leaf, Briefcase, ChefHat, Package } from 'lucide-react';
import { KitchenStockTake } from '@/components/Kitchen/KitchenStockTake';
import { KitchenInventory } from '@/components/Kitchen/KitchenInventory';
import { IngredientsStockTake } from '@/components/Kitchen/IngredientsStockTake';
import { IngredientsManagement } from '@/components/Kitchen/IngredientsManagement';
import { OfficeStockTake } from '@/components/Office/OfficeStockTake';
import { UtensilsStockTake } from '@/components/Kitchen/UtensilsStockTake';
import { UtensilsManagement } from '@/components/Kitchen/UtensilsManagement';

// Lazy-mount: only renders children after first activation
function Lazy({ active, children }: { active: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (active) setMounted(true); }, [active]);
  return mounted ? <>{children}</> : null;
}

type Section = 'kitchen' | 'ingredients' | 'office' | 'utensils' | 'general';

interface StockHubProps {
  readOnly?: boolean;
  /** Pass the General section content (bar stock, purchase orders, etc.) from the parent dashboard */
  generalContent?: ReactNode;
}

const SECTIONS: { id: Section; label: string; icon: React.FC<any> }[] = [
  { id: 'kitchen',     label: 'Kitchen',     icon: ChefHat },
  { id: 'ingredients', label: 'Ingredients', icon: Leaf },
  { id: 'office',      label: 'Office',      icon: Briefcase },
  { id: 'utensils',    label: 'Utensils',    icon: UtensilsCrossed },
];

export function StockHub({ readOnly = false, generalContent }: StockHubProps) {
  const sections = generalContent
    ? [...SECTIONS, { id: 'general' as Section, label: 'General Stock', icon: Package }]
    : SECTIONS;

  const [section, setSection] = useState<Section>('kitchen');
  const [kitchenTab, setKitchenTab] = useState('stock-take');
  const [ingredientsTab, setIngredientsTab] = useState('stock-take');
  const [utensilsTab, setUtensilsTab] = useState('stock-take');

  return (
    <div className="space-y-4">
      {/* Section switcher */}
      <div className="flex flex-wrap gap-2">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              section === id
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Kitchen ──────────────────────────────────────────────────────── */}
      {section === 'kitchen' && (
        <Tabs value={kitchenTab} onValueChange={setKitchenTab}>
          <TabsList className="flex flex-wrap w-full h-auto gap-1 mb-4">
            <TabsTrigger value="stock-take">Daily Stock Take</TabsTrigger>
            <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          </TabsList>
          <TabsContent value="stock-take">
            <Lazy active={kitchenTab === 'stock-take'}>
              <KitchenStockTake readOnly={readOnly} />
            </Lazy>
          </TabsContent>
          <TabsContent value="inventory">
            <Lazy active={kitchenTab === 'inventory'}>
              <KitchenInventory readOnly={readOnly} />
            </Lazy>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Ingredients ──────────────────────────────────────────────────── */}
      {section === 'ingredients' && (
        <Tabs value={ingredientsTab} onValueChange={setIngredientsTab}>
          <TabsList className="flex flex-wrap w-full h-auto gap-1 mb-4">
            <TabsTrigger value="stock-take">Daily Stock Take</TabsTrigger>
            {!readOnly && <TabsTrigger value="catalogue">Catalogue</TabsTrigger>}
          </TabsList>
          <TabsContent value="stock-take">
            <Lazy active={ingredientsTab === 'stock-take'}>
              <IngredientsStockTake readOnly={readOnly} />
            </Lazy>
          </TabsContent>
          {!readOnly && (
            <TabsContent value="catalogue">
              <Lazy active={ingredientsTab === 'catalogue'}>
                <IngredientsManagement readOnly={false} />
              </Lazy>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* ── Office ───────────────────────────────────────────────────────── */}
      {section === 'office' && (
        <Lazy active={section === 'office'}>
          <OfficeStockTake readOnly={readOnly} />
        </Lazy>
      )}

      {/* ── Utensils ─────────────────────────────────────────────────────── */}
      {section === 'utensils' && (
        <Tabs value={utensilsTab} onValueChange={setUtensilsTab}>
          <TabsList className="flex flex-wrap w-full h-auto gap-1 mb-4">
            <TabsTrigger value="stock-take">Daily Count</TabsTrigger>
            {!readOnly && <TabsTrigger value="catalogue">Catalogue</TabsTrigger>}
          </TabsList>
          <TabsContent value="stock-take">
            <Lazy active={utensilsTab === 'stock-take'}>
              <UtensilsStockTake readOnly={readOnly} />
            </Lazy>
          </TabsContent>
          {!readOnly && (
            <TabsContent value="catalogue">
              <Lazy active={utensilsTab === 'catalogue'}>
                <UtensilsManagement readOnly={false} />
              </Lazy>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* ── General (bar stock, purchase orders, etc. — passed by parent) ─ */}
      {section === 'general' && generalContent && (
        <Lazy active={section === 'general'}>
          {generalContent}
        </Lazy>
      )}
    </div>
  );
}
