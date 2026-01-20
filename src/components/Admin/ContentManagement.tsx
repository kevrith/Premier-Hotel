import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Database, Coffee, Hotel, Tag, Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { menuAPI, MenuItem } from '@/lib/api/menu';
import { roomsAPI, Room } from '@/lib/api/rooms';
import MenuItemForm from './MenuItemForm';
import RoomForm from './RoomForm';
import { PricingManager } from './PricingManager';
import { PromotionsManager } from './PromotionsManager';

export function ContentManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const [menuData, roomsData] = await Promise.all([
        menuAPI.listMenuItems(),
        roomsAPI.listRooms()
      ]);

      setMenuItems(menuData);
      setRooms(roomsData);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message || "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMenuItem = async (itemData: any) => {
    try {
      if (editingItem) {
        await menuAPI.updateMenuItem(editingItem.id, itemData);

        toast({
          title: "Menu item updated",
          description: "The menu item has been updated successfully"
        });
      } else {
        await menuAPI.createMenuItem(itemData);

        toast({
          title: "Menu item created",
          description: "The menu item has been created successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error saving menu item",
        description: error.message || "Failed to save menu item",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      await menuAPI.deleteMenuItem(id);

      toast({
        title: "Menu item deleted",
        description: "The menu item has been deleted successfully"
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting menu item",
        description: error.message || "Failed to delete menu item",
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

  // Room CRUD handlers
  const handleSaveRoom = async (roomData: any) => {
    try {
      if (editingRoom) {
        await roomsAPI.updateRoom(editingRoom.id, roomData);

        toast({
          title: "Room updated",
          description: "The room has been updated successfully"
        });
      } else {
        await roomsAPI.createRoom(roomData);

        toast({
          title: "Room created",
          description: "The room has been created successfully"
        });
      }

      setIsRoomDialogOpen(false);
      setEditingRoom(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error saving room",
        description: error.message || "Failed to save room",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      await roomsAPI.deleteRoom(id);

      toast({
        title: "Room deleted",
        description: "The room has been deleted successfully"
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting room",
        description: error.message || "Failed to delete room",
        variant: "destructive"
      });
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setIsRoomDialogOpen(true);
  };

  const handleNewRoom = () => {
    setEditingRoom(null);
    setIsRoomDialogOpen(true);
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="menu">
                <Coffee className="h-4 w-4 mr-2" />
                Menu Items
              </TabsTrigger>
              <TabsTrigger value="rooms">
                <Hotel className="h-4 w-4 mr-2" />
                Rooms
              </TabsTrigger>
              <TabsTrigger value="pricing">
                <DollarSign className="h-4 w-4 mr-2" />
                Pricing
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
                      <DialogDescription>
                        {editingItem ? 'Update the menu item details below.' : 'Fill in the details to create a new menu item.'}
                      </DialogDescription>
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
                        <TableCell>KES {item.base_price}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category || 'N/A'}</Badge>
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
                <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleNewRoom}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRoom ? 'Edit Room' : 'Add New Room'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingRoom ? 'Update the room details below.' : 'Fill in the details to create a new room.'}
                      </DialogDescription>
                    </DialogHeader>
                    <RoomForm
                      room={editingRoom}
                      onSave={handleSaveRoom}
                      onCancel={() => {
                        setIsRoomDialogOpen(false);
                        setEditingRoom(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
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
                          <Badge variant="outline">{room.type}</Badge>
                        </TableCell>
                        <TableCell>KES {room.price_per_night}</TableCell>
                        <TableCell>
                          <Badge variant={room.is_available ? 'default' : 'secondary'}>
                            {room.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRoom(room)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRoom(room.id)}
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

            <TabsContent value="pricing" className="space-y-4">
              <PricingManager />
            </TabsContent>

            <TabsContent value="promotions" className="space-y-4">
              <PromotionsManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
