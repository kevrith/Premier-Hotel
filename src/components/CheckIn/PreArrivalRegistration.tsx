import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Mail, Phone, CreditCard, FileText, Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { checkinCheckoutService } from '@/lib/api/checkin-checkout';
import toast from 'react-hot-toast';

interface PreArrivalRegistrationProps {
  bookingId: string;
  bookingDetails: {
    checkInDate: string;
    checkOutDate: string;
    roomType: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
  };
}

export function PreArrivalRegistration({ bookingId, bookingDetails }: PreArrivalRegistrationProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: bookingDetails.guestName?.split(' ')[0] || '',
    last_name: bookingDetails.guestName?.split(' ').slice(1).join(' ') || '',
    email: bookingDetails.guestEmail || '',
    phone: bookingDetails.guestPhone || '',
    date_of_birth: '',
    nationality: '',

    // ID Information
    id_type: 'passport',
    id_number: '',
    id_expiry_date: '',

    // Address
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',

    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',

    // Arrival & Preferences
    estimated_arrival_time: '',
    room_preferences: '',
    special_requests: '',

    // Additional
    purpose_of_visit: 'leisure',
    vehicle_registration: '',
    number_of_guests: 1,
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setIdDocument(file);
      toast.success('ID document uploaded');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Create guest registration
      const registration = await checkinCheckoutService.createGuestRegistration({
        booking_id: bookingId,
        ...formData,
        id_verified: false, // Will be verified by staff
      });

      // TODO: Upload ID document if provided
      if (idDocument) {
        // This would require a file upload endpoint
        console.log('ID document to upload:', idDocument);
      }

      toast.success('Pre-arrival registration completed successfully!');
      navigate('/my-bookings');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = () => {
    return formData.first_name && formData.last_name && formData.email &&
           formData.phone && formData.date_of_birth && formData.nationality;
  };

  const isStep2Valid = () => {
    return formData.id_type && formData.id_number && formData.id_expiry_date;
  };

  const isStep3Valid = () => {
    return formData.address_line1 && formData.city && formData.country;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Pre-Arrival Registration</CardTitle>
          <CardDescription>
            Complete your registration before arrival for a faster check-in experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'
              }`}>
                {step > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
              </div>
              <span className="text-sm font-medium">Personal Info</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div className={`h-full transition-all ${step >= 2 ? 'bg-primary w-full' : 'w-0'}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'
              }`}>
                {step > 2 ? <CheckCircle className="h-5 w-5" /> : '2'}
              </div>
              <span className="text-sm font-medium">ID & Address</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div className={`h-full transition-all ${step >= 3 ? 'bg-primary w-full' : 'w-0'}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-primary text-white' : 'bg-gray-200'
              }`}>
                {step > 3 ? <CheckCircle className="h-5 w-5" /> : '3'}
              </div>
              <span className="text-sm font-medium">Preferences</span>
            </div>
          </div>

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john.doe@example.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      className="pl-10"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+254 700 000000"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date_of_birth"
                      type="date"
                      className="pl-10"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    placeholder="e.g., Kenyan"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="+254 700 000000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Input
                  id="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!isStep1Valid()}>
                  Next: ID & Address
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: ID & Address */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="id_type">ID Type *</Label>
                  <Select value={formData.id_type} onValueChange={(value) => handleInputChange('id_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="id_number">ID Number *</Label>
                  <Input
                    id="id_number"
                    value={formData.id_number}
                    onChange={(e) => handleInputChange('id_number', e.target.value)}
                    placeholder="ID123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="id_expiry_date">ID Expiry Date *</Label>
                  <Input
                    id="id_expiry_date"
                    type="date"
                    value={formData.id_expiry_date}
                    onChange={(e) => handleInputChange('id_expiry_date', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="id_document">Upload ID Document (Optional)</Label>
                <div className="mt-2 flex items-center gap-4">
                  <Input
                    id="id_document"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('id_document')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {idDocument ? idDocument.name : 'Choose File'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Max 5MB (JPG, PNG, PDF)
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Address Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address_line1">Address Line 1 *</Label>
                    <Input
                      id="address_line1"
                      value={formData.address_line1}
                      onChange={(e) => handleInputChange('address_line1', e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address_line2">Address Line 2</Label>
                    <Input
                      id="address_line2"
                      value={formData.address_line2}
                      onChange={(e) => handleInputChange('address_line2', e.target.value)}
                      placeholder="Apartment, suite, etc."
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Nairobi"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="Nairobi County"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        placeholder="00100"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Kenya"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!isStep2Valid() || !isStep3Valid()}>
                  Next: Preferences
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Arrival & Preferences */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_arrival_time">Estimated Arrival Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="estimated_arrival_time"
                      type="time"
                      className="pl-10"
                      value={formData.estimated_arrival_time}
                      onChange={(e) => handleInputChange('estimated_arrival_time', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="purpose_of_visit">Purpose of Visit</Label>
                  <Select value={formData.purpose_of_visit} onValueChange={(value) => handleInputChange('purpose_of_visit', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leisure">Leisure</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number_of_guests">Number of Guests</Label>
                  <Input
                    id="number_of_guests"
                    type="number"
                    min="1"
                    value={formData.number_of_guests}
                    onChange={(e) => handleInputChange('number_of_guests', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="vehicle_registration">Vehicle Registration (Optional)</Label>
                  <Input
                    id="vehicle_registration"
                    value={formData.vehicle_registration}
                    onChange={(e) => handleInputChange('vehicle_registration', e.target.value)}
                    placeholder="KAA 123A"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="room_preferences">Room Preferences</Label>
                <Textarea
                  id="room_preferences"
                  value={formData.room_preferences}
                  onChange={(e) => handleInputChange('room_preferences', e.target.value)}
                  placeholder="e.g., High floor, away from elevator, city view..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="special_requests">Special Requests</Label>
                <Textarea
                  id="special_requests"
                  value={formData.special_requests}
                  onChange={(e) => handleInputChange('special_requests', e.target.value)}
                  placeholder="e.g., Extra pillows, dietary requirements, early check-in..."
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                </h4>
                <div className="text-sm space-y-1">
                  <p><strong>Guest:</strong> {formData.first_name} {formData.last_name}</p>
                  <p><strong>Check-In:</strong> {bookingDetails.checkInDate}</p>
                  <p><strong>Check-Out:</strong> {bookingDetails.checkOutDate}</p>
                  <p><strong>Room Type:</strong> {bookingDetails.roomType}</p>
                  {formData.estimated_arrival_time && (
                    <p><strong>Estimated Arrival:</strong> {formData.estimated_arrival_time}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Complete Registration'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
