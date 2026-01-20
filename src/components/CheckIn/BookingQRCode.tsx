import { QRCodeSVG } from 'qrcode.react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingQRCodeProps {
  bookingId: string;
  guestName: string;
  checkInDate: string;
  roomNumber?: string;
  size?: number;
}

export function BookingQRCode({
  bookingId,
  guestName,
  checkInDate,
  roomNumber,
  size = 200
}: BookingQRCodeProps) {
  // Create a structured QR code payload
  const qrData = JSON.stringify({
    type: 'HOTEL_BOOKING',
    bookingId,
    guestName,
    checkInDate,
    roomNumber: roomNumber || 'TBD',
    timestamp: Date.now(),
  });

  const downloadQRCode = () => {
    const svg = document.getElementById('booking-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `booking-${bookingId}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Your Booking QR Code
        </CardTitle>
        <CardDescription>
          Show this QR code at the front desk for express check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-6 bg-white rounded-lg border">
          <QRCodeSVG
            id="booking-qr-code"
            value={qrData}
            size={size}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Booking ID:</strong> {bookingId}
          </p>
          <p className="text-sm text-blue-900">
            <strong>Guest:</strong> {guestName}
          </p>
          <p className="text-sm text-blue-900">
            <strong>Check-in:</strong> {new Date(checkInDate).toLocaleDateString()}
          </p>
          {roomNumber && (
            <p className="text-sm text-blue-900">
              <strong>Room:</strong> {roomNumber}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={downloadQRCode}
          >
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Save this QR code to your phone for quick access
        </div>
      </CardContent>
    </Card>
  );
}
