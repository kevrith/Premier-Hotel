import { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface WidgetConfig {
  id: string;
  name: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'revenue', name: "Today's Revenue", visible: true },
  { id: 'occupancy', name: 'Occupancy Rate', visible: true },
  { id: 'staff', name: 'Active Staff', visible: true },
  { id: 'tasks', name: 'Pending Tasks', visible: true },
  { id: 'activity', name: 'Recent Activity', visible: true },
  { id: 'performance', name: 'Staff Performance', visible: true },
];

export function DashboardCustomization() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    if (saved) {
      setWidgets(JSON.parse(saved));
    }
  }, []);

  const toggleWidget = (id: string) => {
    const updated = widgets.map(w =>
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    setWidgets(updated);
    localStorage.setItem('dashboard_widgets', JSON.stringify(updated));
    window.dispatchEvent(new Event('dashboard-widgets-updated'));
  };

  const resetToDefault = () => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.setItem('dashboard_widgets', JSON.stringify(DEFAULT_WIDGETS));
    window.dispatchEvent(new Event('dashboard-widgets-updated'));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Choose which widgets to display on your dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {widgets.map((widget) => (
            <div key={widget.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {widget.visible ? (
                  <Eye className="h-4 w-4 text-green-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                )}
                <span className={widget.visible ? '' : 'text-muted-foreground'}>
                  {widget.name}
                </span>
              </div>
              <Switch
                checked={widget.visible}
                onCheckedChange={() => toggleWidget(widget.id)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefault}>
            Reset to Default
          </Button>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useWidgetVisibility() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);

  useEffect(() => {
    const loadWidgets = () => {
      const saved = localStorage.getItem('dashboard_widgets');
      if (saved) {
        setWidgets(JSON.parse(saved));
      }
    };

    loadWidgets();
    window.addEventListener('dashboard-widgets-updated', loadWidgets);
    return () => window.removeEventListener('dashboard-widgets-updated', loadWidgets);
  }, []);

  const isVisible = (id: string) => {
    const widget = widgets.find(w => w.id === id);
    return widget ? widget.visible : true;
  };

  return { isVisible, widgets };
}
