import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Upload, X, Image as ImageIcon, Loader2, Crop as CropIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

// Default aspect ratios per bucket
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

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

/** Draw the cropped region onto a canvas and return a Blob */
async function getCroppedBlob(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  mimeType = 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;

  const ctx = canvas.getContext('2d')!;
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
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      mimeType,
      quality,
    );
  });
}

export default function ImageUpload({
  value,
  onChange,
  bucket = 'menu-images',
  label = 'Image',
}: ImageUploadProps) {
  const [uploading, setUploading]         = useState(false);
  const [showUrlInput, setShowUrlInput]   = useState(false);

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [srcUrl, setSrcUrl]                 = useState('');
  const [mimeType, setMimeType]             = useState('image/jpeg');
  const [crop, setCrop]                     = useState<Crop>();
  const [completedCrop, setCompletedCrop]   = useState<PixelCrop>();
  const [aspect, setAspect]                 = useState<number>(ASPECT_RATIOS[bucket] ?? 4 / 3);
  const [freeform, setFreeform]             = useState(false);

  const imgRef  = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Called when user picks a file — open crop dialog instead of uploading
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setSrcUrl(reader.result as string);
      const defaultAspect = ASPECT_RATIOS[bucket] ?? 4 / 3;
      setAspect(defaultAspect);
      setFreeform(false);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  // Set initial crop when image loads in dialog
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerAspectCrop(width, height, aspect);
    setCrop(initialCrop);
  }, [aspect]);

  // When user toggles freeform / changes aspect, re-center crop
  const handleAspectChange = (newAspect: number | undefined) => {
    if (!imgRef.current) return;
    if (newAspect === undefined) {
      setFreeform(true);
      setAspect(0);
      setCrop(undefined); // let user draw fresh
    } else {
      setFreeform(false);
      setAspect(newAspect);
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, newAspect));
    }
  };

  // Crop & upload
  const handleCropAndUpload = async () => {
    if (!completedCrop || !imgRef.current) {
      toast.error('Please select a crop area first');
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
        setCropDialogOpen(false);
      } else {
        toast.error('Upload succeeded but no URL returned');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

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
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
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

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex-1"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Upload &amp; Crop</>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput(v => !v)}
        >
          URL
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {showUrlInput && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="text-sm"
        />
      )}

      {/* ── Crop Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="h-5 w-5" />
              Crop Image
            </DialogTitle>
          </DialogHeader>

          {/* Aspect ratio presets */}
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="text-muted-foreground text-xs self-center">Ratio:</span>
            {[
              { label: '4:3 (Menu)',    value: 4 / 3 },
              { label: '16:9 (Room)',   value: 16 / 9 },
              { label: '1:1 (Square)', value: 1 },
              { label: 'Free',          value: undefined },
            ].map(({ label: l, value: v }) => (
              <button
                key={l}
                type="button"
                onClick={() => handleAspectChange(v)}
                className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                  (v === undefined ? freeform : !freeform && Math.abs(aspect - v) < 0.01)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {l}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const def = ASPECT_RATIOS[bucket] ?? 4 / 3;
                handleAspectChange(def);
              }}
              className="px-3 py-1 rounded-full border text-xs border-border hover:bg-muted flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>

          {/* Crop area */}
          <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden max-h-[50vh]">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={freeform ? undefined : aspect}
              minWidth={50}
              minHeight={50}
              keepSelection
            >
              <img
                ref={imgRef}
                src={srcUrl}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{ maxHeight: '50vh', maxWidth: '100%', objectFit: 'contain' }}
              />
            </ReactCrop>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition · Drag handles to resize · Only the selected area will be uploaded
          </p>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCropDialogOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropAndUpload}
              disabled={uploading || !completedCrop}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <><CropIcon className="h-4 w-4 mr-2" />Crop &amp; Upload</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
