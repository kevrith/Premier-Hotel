import { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, Clock, AlertCircle, Search, Filter, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { checkinCheckoutService } from '@/lib/api/checkin-checkout';
import bookingService from '@/lib/api/services/bookingService';
import toast from 'react-hot-toast';

interface BookingWithRegistration {
  booking: any;
  registration?: any;
  checkin?: any;
}

export default function StaffCheckInDashboard() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('arrivals');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Data
  const [arrivals, setArrivals] = useState<BookingWithRegistration[]>([]);
  const [departures, setDepartures] = useState<BookingWithRegistration[]>([]);
  const [stats, setStats] = useState({
    todayArrivals: 0,
    todayDepartures: 0,
    pendingCheckIns: 0,
    pendingCheckOuts: 0,
  });

  // Dialogs
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRegistration | null>(null);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);

  // Check-in form
  const [roomNumber, setRoomNumber] = useState('');
  const [keyCardNumber, setKeyCardNumber] = useState('');
  const [depositAmount, setDepositAmount] = useState(0);
  const [checkInNotes, setCheckInNotes] = useState('');

  // Check-out form
  const [roomCondition, setRoomCondition] = useState<'excellent' | 'good' | 'fair' | 'damaged'>('good');
  const [damageCharge, setDamageCharge] = useState(0);
  const [minibarCharge, setMinibarCharge] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [checkOutNotes, setCheckOutNotes] = useState('');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all bookings (in a real app, you'd filter by date on the backend)
      const bookings = await bookingService.getAllBookings();
      const registrations = await checkinCheckoutService.getGuestRegistrations();
      const checkins = await checkinCheckoutService.getCheckins();
      const checkouts = await checkinCheckoutService.getCheckouts();

      const today = new Date().toISOString().split('T')[0];

      // Filter today's arrivals
      const todayArrivals = bookings
        .filter((b: any) => b.check_in_date?.startsWith(today))
        .map((booking: any) => ({
          booking,
          registration: registrations.find((r: any) => r.booking_id === booking.id),
          checkin: checkins.find((c: any) => c.booking_id === booking.id),
        }));

      // Filter today's departures
      const todayDepartures = bookings
        .filter((b: any) => b.check_out_date?.startsWith(today))
        .map((booking: any) => {
          const checkin = checkins.find((c: any) => c.booking_id === booking.id);
          return {
            booking,
            checkin,
            checkout: checkouts.find((co: any) => co.checkin_id === checkin?.id),
          };
        });

      setArrivals(todayArrivals);
      setDepartures(todayDepartures);

      setStats({
        todayArrivals: todayArrivals.length,
        todayDepartures: todayDepartures.length,
        pendingCheckIns: todayArrivals.filter((a) => !a.checkin || a.checkin.status !== 'completed').length,
        pendingCheckOuts: todayDepartures.filter((d: any) => !d.checkout || d.checkout.status !== 'completed').length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleProcessCheckIn = async () => {
    if (!selectedBooking || !roomNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let checkinId = selectedBooking.checkin?.id;

      // Create check-in if doesn't exist
      if (!checkinId) {
        const newCheckin = await checkinCheckoutService.createCheckin({
          booking_id: selectedBooking.booking.id,
          registration_id: selectedBooking.registration?.id,
          checkin_type: 'standard',
          status: 'pending',
        });
        checkinId = newCheckin.id;
      }

      // Process check-in
      await checkinCheckoutService.processCheckin(checkinId, {
        room_number: roomNumber,
        key_card_number: keyCardNumber || `KEY-${Date.now()}`,
        deposit_amount: depositAmount,
        notes: checkInNotes,
      });

      // Complete check-in
      await checkinCheckoutService.completeCheckin(checkinId);

      toast.success('Check-in completed successfully');
      setCheckInDialogOpen(false);
      resetCheckInForm();
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to process check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessCheckOut = async () => {
    if (!selectedBooking?.checkin) {
      toast.error('Check-in record not found');
      return;
    }

    setLoading(true);
    try {
      // Create checkout record
      const checkout = await checkinCheckoutService.createCheckout({
        checkin_id: selectedBooking.checkin.id,
        checkout_type: 'standard',
        status: 'pending',
      });

      // Process checkout
      const totalAmount = selectedBooking.booking.total_amount + damageCharge + minibarCharge + otherCharges;

      await checkinCheckoutService.processCheckout(checkout.id, {
        room_condition: roomCondition,
        damage_charge: damageCharge,
        minibar_charge: minibarCharge,
        other_charges: otherCharges,
        total_amount: totalAmount,
        notes: checkOutNotes,
      });

      // Complete checkout
      await checkinCheckoutService.completeCheckout(checkout.id);

      toast.success('Check-out completed successfully');
      setCheckOutDialogOpen(false);
      resetCheckOutForm();
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to process check-out');
    } finally {
      setLoading(false);
    }
  };

  const resetCheckInForm = () => {
    setRoomNumber('');
    setKeyCardNumber('');
    setDepositAmount(0);
    setCheckInNotes('');
    setSelectedBooking(null);
  };

  const resetCheckOutForm = () => {
    setRoomCondition('good');
    setDamageCharge(0);
    setMinibarCharge(0);
    setOtherCharges(0);
    setCheckOutNotes('');
    setSelectedBooking(null);
  };

  const getStatusBadge = (item: any, type: 'checkin' | 'checkout') => {
    if (type === 'checkin') {
      if (!item.checkin) return <Badge variant="outline">Not Started</Badge>;
      if (item.checkin.status === 'completed') return <Badge className="bg-green-600">Completed</Badge>;
      if (item.checkin.status === 'in_progress') return <Badge className="bg-blue-600">In Progress</Badge>;
      return <Badge variant="outline">Pending</Badge>;
    } else {
      if (!item.checkout) return <Badge variant="outline">Not Started</Badge>;
      if (item.checkout.status === 'completed') return <Badge className="bg-green-600">Completed</Badge>;
      if (item.checkout.status === 'in_progress') return <Badge className="bg-blue-600">In Progress</Badge>;
      return <Badge variant="outline">Pending</Badge>;
    }
  };

  const filteredArrivals = arrivals.filter((item) => {
    const matchesSearch = searchQuery === '' ||
      item.booking.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.booking.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'pending' && (!item.checkin || item.checkin.status !== 'completed')) ||
      (statusFilter === 'completed' && item.checkin?.status === 'completed');

    return matchesSearch && matchesStatus;
  });

  const filteredDepartures = departures.filter((item: any) => {
    const matchesSearch = searchQuery === '' ||
      item.booking.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.booking.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'pending' && (!item.checkout || item.checkout.status !== 'completed')) ||
      (statusFilter === 'completed' && item.checkout?.status === 'completed');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Check-In / Check-Out Dashboard</h1>
        <p className="text-muted-foreground">Manage today's arrivals and departures</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Today's Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayArrivals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today's Departures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayDepartures}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Pending Check-Ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.pendingCheckIns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Pending Check-Outs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.pendingCheckOuts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="arrivals">
            Arrivals ({filteredArrivals.length})
          </TabsTrigger>
          <TabsTrigger value="departures">
            Departures ({filteredDepartures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals" className="space-y-4 mt-6">
          {filteredArrivals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No arrivals found</p>
              </CardContent>
            </Card>
          ) : (
            filteredArrivals.map((item) => (
              <Card key={item.booking.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{item.booking.guest_name}</h3>
                        {getStatusBadge(item, 'checkin')}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Booking ID:</span> {item.booking.id}
                        </div>
                        <div>
                          <span className="font-medium">Room Type:</span> {item.booking.room_type}
                        </div>
                        <div>
                          <span className="font-medium">Guests:</span> {item.booking.number_of_guests || 1}
                        </div>
                        {item.registration && (
                          <>
                            <div>
                              <span className="font-medium">Phone:</span> {item.registration.phone}
                            </div>
                            <div>
                              <span className="font-medium">Email:</span> {item.registration.email}
                            </div>
                            <div>
                              <span className="font-medium">ID Type:</span> {item.registration.id_type}
                            </div>
                          </>
                        )}
                        {item.checkin?.room_number && (
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            <span><strong>Room:</strong> {item.checkin.room_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!item.registration && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(item);
                            setRegistrationDialogOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      )}
                      {item.checkin?.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(item);
                            setCheckInDialogOpen(true);
                          }}
                        >
                          Process Check-In
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="departures" className="space-y-4 mt-6">
          {filteredDepartures.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No departures found</p>
              </CardContent>
            </Card>
          ) : (
            filteredDepartures.map((item: any) => (
              <Card key={item.booking.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{item.booking.guest_name}</h3>
                        {getStatusBadge(item, 'checkout')}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Booking ID:</span> {item.booking.id}
                        </div>
                        <div>
                          <span className="font-medium">Room:</span> {item.checkin?.room_number || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Total Amount:</span> KES {item.booking.total_amount?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div>
                      {item.checkout?.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(item);
                            setCheckOutDialogOpen(true);
                          }}
                        >
                          Process Check-Out
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Check-In Dialog */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Check-In</DialogTitle>
            <DialogDescription>
              Complete the check-in process for {selectedBooking?.booking.guest_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room_number">Room Number *</Label>
                <Input
                  id="room_number"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g., 101"
                />
              </div>
              <div>
                <Label htmlFor="key_card">Key Card Number</Label>
                <Input
                  id="key_card"
                  value={keyCardNumber}
                  onChange={(e) => setKeyCardNumber(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="deposit">Security Deposit (KES)</Label>
              <Input
                id="deposit"
                type="number"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="checkin_notes">Notes</Label>
              <Textarea
                id="checkin_notes"
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Any special notes or requests..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessCheckIn} disabled={loading || !roomNumber}>
              {loading ? 'Processing...' : 'Complete Check-In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={checkOutDialogOpen} onOpenChange={setCheckOutDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Check-Out</DialogTitle>
            <DialogDescription>
              Complete the check-out process for {selectedBooking?.booking.guest_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="room_condition">Room Condition</Label>
              <Select value={roomCondition} onValueChange={(value: any) => setRoomCondition(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="damage">Damage Charges (KES)</Label>
                <Input
                  id="damage"
                  type="number"
                  min="0"
                  value={damageCharge}
                  onChange={(e) => setDamageCharge(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="minibar">Minibar Charges (KES)</Label>
                <Input
                  id="minibar"
                  type="number"
                  min="0"
                  value={minibarCharge}
                  onChange={(e) => setMinibarCharge(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="other">Other Charges (KES)</Label>
                <Input
                  id="other"
                  type="number"
                  min="0"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Room Charges:</span>
                <span>KES {selectedBooking?.booking.total_amount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Additional Charges:</span>
                <span>KES {(damageCharge + minibarCharge + otherCharges).toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-blue-600">
                  KES {((selectedBooking?.booking.total_amount || 0) + damageCharge + minibarCharge + otherCharges).toLocaleString()}
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="checkout_notes">Notes</Label>
              <Textarea
                id="checkout_notes"
                value={checkOutNotes}
                onChange={(e) => setCheckOutNotes(e.target.value)}
                placeholder="Room inspection notes, issues found, etc..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCheckOutDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessCheckOut} disabled={loading}>
              {loading ? 'Processing...' : 'Complete Check-Out'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registration Details Dialog */}
      <Dialog open={registrationDialogOpen} onOpenChange={setRegistrationDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Guest has not completed pre-arrival registration
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-600 mb-2" />
              <p className="text-sm text-amber-900">
                This guest has not completed online pre-arrival registration.
                You can assist them with check-in at the front desk.
              </p>
            </div>
            {selectedBooking && (
              <div className="space-y-2 text-sm">
                <p><strong>Booking ID:</strong> {selectedBooking.booking.id}</p>
                <p><strong>Guest Name:</strong> {selectedBooking.booking.guest_name}</p>
                <p><strong>Room Type:</strong> {selectedBooking.booking.room_type}</p>
                <p><strong>Check-In Date:</strong> {new Date(selectedBooking.booking.check_in_date).toLocaleDateString()}</p>
                <p><strong>Check-Out Date:</strong> {new Date(selectedBooking.booking.check_out_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setRegistrationDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
