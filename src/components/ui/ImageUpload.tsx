import { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Upload, X, Image as ImageIcon, Loader2, Crop as CropIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const ASPECT_RATIOS: Record<string, number> = {
  'menu-images':    4 / 3,
  'room-images':   16 / 9,
  'profile-images': 1 / 1,
};

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: 'menu-images' | 'room-images' | 'profile-images';
  label?: string;
}

function makeCentered(width: number, height: number, aspect: number | undefined): Crop {
  if (!aspect) {
    // Free crop — select 80% of the image
    return { unit: '%', x: 10, y: 10, width: 80, height: 80 };
  }
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
    width,
    height,
  );
}

async function getCroppedBlob(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  mimeType = 'image/jpeg',
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;

  // Account for the difference between displayed size and natural size
  const scaleX = image.naturalWidth  / image.width;
  const scaleY = image.naturalHeight / image.height;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width  * scaleX,
    pixelCrop.height * scaleY,
    0, 0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
      mimeType,
      0.92,
    );
  });
}

export default function ImageUpload({
  value,
  onChange,
  bucket = 'menu-images',
  label = 'Image',
}: ImageUploadProps) {
  const [uploading, setUploading]       = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Crop state
  const [cropOpen, setCropOpen]               = useState(false);
  const [srcUrl, setSrcUrl]                   = useState('');
  const [mimeType, setMimeType]               = useState('image/jpeg');
  const [crop, setCrop]                       = useState<Crop>();
  const [completedCrop, setCompletedCrop]     = useState<PixelCrop>();
  const [aspect, setAspect]                   = useState<number | undefined>(ASPECT_RATIOS[bucket]);
  const [imgLoaded, setImgLoaded]             = useState(false);

  const imgRef  = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // When the image finishes loading inside the dialog, initialise the crop box
  useEffect(() => {
    if (!imgLoaded || !imgRef.current) return;
    const { width, height } = imgRef.current;
    if (width === 0 || height === 0) return;
    setCrop(makeCentered(width, height, aspect));
  }, [imgLoaded, aspect]);

  const openCropDialog = (file: File) => {
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setSrcUrl(reader.result as string);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setImgLoaded(false);
      setAspect(ASPECT_RATIOS[bucket]);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openCropDialog(file);
  };

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    // Re-initialise crop for the new aspect immediately
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (width > 0 && height > 0) {
        setCrop(makeCentered(width, height, newAspect));
        setCompletedCrop(undefined);
      }
    }
  };

  const handleCropAndUpload = async () => {
    if (!completedCrop || !imgRef.current) {
      toast.error('Please draw a crop area first');
      return;
    }
    if (completedCrop.width < 10 || completedCrop.height < 10) {
      toast.error('Crop area is too small — please drag to select a larger area');
      return;
    }
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop, mimeType);
      const ext  = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const file = new File([blob], `upload.${ext}`, { type: mimeType });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);

      const res  = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);

      const data = (res.data as any);
      const url: string = data?.url || (typeof data === 'string' ? data : '');
      if (url) {
        onChange(url);
        toast.success('Image uploaded');
        setCropOpen(false);
      } else {
        toast.error('Upload succeeded but no URL returned');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const PRESETS = [
    { label: '4:3 (Menu)',    value: 4 / 3 },
    { label: '16:9 (Room)',   value: 16 / 9 },
    { label: '1:1 (Square)', value: 1 },
    { label: 'Free',          value: undefined as number | undefined },
  ];

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium block">{label}</label>}

      {/* Preview */}
      {value ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground">
          <ImageIcon className="h-8 w-8 opacity-40" />
          <span className="text-sm">No image selected</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading}
          onClick={() => fileRef.current?.click()} className="flex-1">
          {uploading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
            : <><Upload className="h-4 w-4 mr-2" />Upload &amp; Crop</>}
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => setShowUrlInput(v => !v)}>URL</Button>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden" onChange={handleFileSelect} />

      {showUrlInput && (
        <Input value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://..." className="text-sm" />
      )}

      {/* ── Crop Dialog ── */}
      <Dialog open={cropOpen} onOpenChange={open => { if (!uploading) setCropOpen(open); }}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="h-5 w-5" />
              Crop Image
            </DialogTitle>
          </DialogHeader>

          {/* Aspect ratio presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Ratio:</span>
            {PRESETS.map(({ label: l, value: v }) => {
              const isActive = v === undefined
                ? aspect === undefined
                : aspect !== undefined && Math.abs(aspect - v) < 0.01;
              return (
                <button key={l} type="button" onClick={() => handleAspectChange(v)}
                  className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}>
                  {l}
                </button>
              );
            })}
            <button type="button"
              onClick={() => handleAspectChange(ASPECT_RATIOS[bucket])}
              className="px-3 py-1 rounded-full border text-xs border-border hover:bg-muted flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>

          {/* Crop area — scrollable so tall images are reachable */}
          <div className="overflow-auto rounded-lg bg-black/80"
            style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              aspect={aspect}
              minWidth={40}
              minHeight={40}
              keepSelection
            >
              {/* Image is 100% wide; height is natural (scrollable) */}
              <img
                ref={imgRef}
                src={srcUrl}
                alt="Crop"
                style={{ display: 'block', width: '100%', height: 'auto' }}
                onLoad={() => setImgLoaded(true)}
              />
            </ReactCrop>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag the box to reposition · Drag the handles to resize · Scroll to reach the bottom of tall images
          </p>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline"
              onClick={() => setCropOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCropAndUpload}
              disabled={uploading || !completedCrop}>
              {uploading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                : <><CropIcon className="h-4 w-4 mr-2" />Crop &amp; Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
