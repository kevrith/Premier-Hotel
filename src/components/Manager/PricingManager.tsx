import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, TrendingUp, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function PricingManager() {
  const [basePricing, setBasePricing] = useState([]);
  const [seasonalRates, setSeasonalRates] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setIsLoading(true);
      // Fetch room types and their base pricing
      const { data: rooms, error } = await supabase
        .from('hotel_rooms')
        .select('id, name, room_type, base_price_kes, price_per_night');

      if (error) throw error;
      setBasePricing(rooms || []);
    } catch (error: any) {
      toast({
        title: "Error loading pricing",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRoomPrice = async (roomId: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from('hotel_rooms')
        .update({ price_per_night: newPrice })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "Price updated",
        description: "Room pricing has been updated successfully"
      });

      fetchPricingData();
    } catch (error: any) {
      toast({
        title: "Error updating price",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Configuration
          </CardTitle>
          <CardDescription>
            Manage room pricing, seasonal rates, and discounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="base" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="base">
                <DollarSign className="h-4 w-4 mr-2" />
                Base Pricing
              </TabsTrigger>
              <TabsTrigger value="seasonal">
                <Calendar className="h-4 w-4 mr-2" />
                Seasonal Rates
              </TabsTrigger>
              <TabsTrigger value="discounts">
                <TrendingUp className="h-4 w-4 mr-2" />
                Discounts
              </TabsTrigger>
            </TabsList>

            {/* Base Pricing Tab */}
            <TabsContent value="base" className="space-y-4">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading pricing...</p>
                  </div>
                ) : (
                  basePricing.map((room: any) => (
                    <Card key={room.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{room.name}</h4>
                            <p className="text-sm text-muted-foreground">{room.room_type}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold">KES {room.price_per_night || room.base_price_kes}</p>
                              <p className="text-xs text-muted-foreground">per night</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newPrice = prompt('Enter new price:', room.price_per_night?.toString() || room.base_price_kes?.toString());
                                if (newPrice) {
                                  updateRoomPrice(room.id, parseFloat(newPrice));
                                }
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Seasonal Rates Tab */}
            <TabsContent value="seasonal" className="space-y-4">
              <div className="flex justify-end mb-4">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Seasonal Rate
                </Button>
              </div>
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Seasonal Pricing</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure special rates for peak seasons, holidays, and events
                </p>
                <Button variant="outline">
                  Configure Seasonal Rates
                </Button>
              </div>
            </TabsContent>

            {/* Discounts Tab */}
            <TabsContent value="discounts" className="space-y-4">
              <div className="flex justify-end mb-4">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Discount Rule
                </Button>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Early Bird Discount</h4>
                        <p className="text-sm text-muted-foreground">Book 30 days in advance</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge>15% OFF</Badge>
                        <Switch defaultChecked />
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Extended Stay Discount</h4>
                        <p className="text-sm text-muted-foreground">5+ nights</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge>20% OFF</Badge>
                        <Switch defaultChecked />
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Loyalty Program Discount</h4>
                        <p className="text-sm text-muted-foreground">For members only</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge>10% OFF</Badge>
                        <Switch defaultChecked />
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}