/**
 * Barcode/QR Code Scanner Component
 * Supports camera-based scanning and manual input for inventory operations
 */
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, X, Check, Scan, Keyboard, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import jsQR from 'jsqr';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string, type: 'barcode' | 'qr') => void;
  title?: string;
  description?: string;
}

export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Item',
  description = 'Scan barcode or QR code to identify inventory item'
}: BarcodeScannerProps) {
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Start camera when in camera mode
  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, scanMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use rear camera on mobile
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        scanFrame();
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Failed to access camera. Please check permissions or use manual input.');
      setScanMode('manual');
      toast.error('Camera access denied. Switched to manual input.');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Try to detect QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data) {
      // Successfully scanned
      handleScanSuccess(code.data, 'qr');
    } else {
      // Continue scanning
      animationRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleScanSuccess = (code: string, type: 'barcode' | 'qr') => {
    setLastScannedCode(code);
    stopCamera();
    onScan(code, type);
    toast.success(`${type === 'qr' ? 'QR Code' : 'Barcode'} scanned successfully!`);
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      toast.error('Please enter a code');
      return;
    }

    handleScanSuccess(manualCode.trim(), 'barcode');
    setManualCode('');
  };

  const handleClose = () => {
    stopCamera();
    setManualCode('');
    setLastScannedCode(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              onClick={() => setScanMode('camera')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </Button>
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setScanMode('manual')}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Manual
            </Button>
          </div>

          {/* Camera Mode */}
          {scanMode === 'camera' && (
            <div className="space-y-3">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                      {/* Scanning Line Animation */}
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-500 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="absolute bottom-4 left-4 right-4">
                  {isScanning ? (
                    <Badge className="bg-green-500 text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Scanning...
                      </div>
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-500 text-white">Camera Inactive</Badge>
                  )}
                </div>
              </div>

              {cameraError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">{cameraError}</div>
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center">
                Position the barcode or QR code within the frame
              </p>
            </div>
          )}

          {/* Manual Mode */}
          {scanMode === 'manual' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Enter Barcode or Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter code manually"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleManualSubmit();
                      }
                    }}
                    autoFocus
                  />
                  <Button onClick={handleManualSubmit}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can also use a barcode scanner device to input codes directly
                </p>
              </div>
            </div>
          )}

          {/* Last Scanned */}
          {lastScannedCode && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Successfully Scanned</p>
                <p className="text-xs text-green-700 font-mono">{lastScannedCode}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
