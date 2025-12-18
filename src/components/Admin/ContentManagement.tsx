import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Database, Coffee, Hotel, Tag, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MenuItemForm from './MenuItemForm';

export function ContentManagement() {
  const [menuItems, setMenuItems] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [menuResponse, roomsResponse] = await Promise.all([
        supabase.from('menu_items').select('*').order('name'),
        supabase.from('hotel_rooms').select('*').order('name')
      ]);

      if (menuResponse.error) throw menuResponse.error;
      if (roomsResponse.error) throw roomsResponse.error;

      setMenuItems(menuResponse.data || []);
      setRooms(roomsResponse.data || []);
    } catch (error) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMenuItem = async (itemData) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        
        toast({
          title: "Menu item updated",
          description: "The menu item has been updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert([itemData]);
        
        if (error) throw error;
        
        toast({
          title: "Menu item created",
          description: "The menu item has been created successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error saving menu item",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Menu item deleted",
        description: "The menu item has been deleted successfully"
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error deleting menu item",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditMenuItem = (item) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleNewMenuItem = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Content Management
          </CardTitle>
          <CardDescription>
            Manage menu items, rooms, and other content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="menu" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="menu">
                <Coffee className="h-4 w-4 mr-2" />
                Menu Items
              </TabsTrigger>
              <TabsTrigger value="rooms">
                <Hotel className="h-4 w-4 mr-2" />
                Rooms
              </TabsTrigger>
              <TabsTrigger value="promotions">
                <Tag className="h-4 w-4 mr-2" />
                Promotions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="menu" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleNewMenuItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Menu Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                      </DialogTitle>
                    </DialogHeader>
                    <MenuItemForm
                      item={editingItem}
                      onSave={handleSaveMenuItem}
                      onCancel={() => {
                        setIsDialogOpen(false);
                        setEditingItem(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading menu items...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>KES {item.price_kes}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category_id || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.is_available ? 'default' : 'secondary'}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMenuItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMenuItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="rooms" className="space-y-4">
              <div className="flex justify-end">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading rooms...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Room Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>{room.room_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{room.room_type}</Badge>
                        </TableCell>
                        <TableCell>KES {room.base_price_kes}</TableCell>
                        <TableCell>
                          <Badge variant={room.is_active ? 'default' : 'secondary'}>
                            {room.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="promotions" className="space-y-4">
              <div className="flex justify-end">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Promotion
                </Button>
              </div>
              <div className="text-center py-8">
                <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Promotions management coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}