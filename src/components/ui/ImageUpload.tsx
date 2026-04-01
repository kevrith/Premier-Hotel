import { useState, useRef } from 'react';
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import {
  Upload, X, Image as ImageIcon, Loader2, Crop as CropIcon, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const BUCKET_ASPECT: Record<string, number> = {
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

/** Render the cropped region to a canvas and return a Blob. */
async function cropToBlob(
  img: HTMLImageElement,
  pixel: PixelCrop,
  mime = 'image/jpeg',
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width  = pixel.width;
  canvas.height = pixel.height;
  const ctx = canvas.getContext('2d')!;
  const scaleX = img.naturalWidth  / img.width;
  const scaleY = img.naturalHeight / img.height;
  ctx.drawImage(
    img,
    pixel.x * scaleX, pixel.y * scaleY,
    pixel.width * scaleX, pixel.height * scaleY,
    0, 0, pixel.width, pixel.height,
  );
  return new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), mime, 0.92),
  );
}

export default function ImageUpload({
  value,
  onChange,
  bucket = 'menu-images',
  label = 'Image',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrl,   setShowUrl]   = useState(false);
  const [cropOpen,  setCropOpen]  = useState(false);
  const [srcUrl,    setSrcUrl]    = useState('');
  const [mime,      setMime]      = useState('image/jpeg');
  const [aspect,    setAspect]    = useState<number | undefined>(BUCKET_ASPECT[bucket]);
  const [crop,      setCrop]      = useState<Crop>();
  const [doneCrop,  setDoneCrop]  = useState<PixelCrop>();

  const imgRef  = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── File picker ──────────────────────────────────────────────────── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setSrcUrl(reader.result as string);
      setAspect(BUCKET_ASPECT[bucket]);
      setCrop(undefined);
      setDoneCrop(undefined);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── Set initial crop once image has rendered (use DISPLAY dimensions) */
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Official react-image-crop pattern: use rendered width/height, not natural
    const { width, height } = e.currentTarget;
    const a = aspect ?? BUCKET_ASPECT[bucket] ?? 4 / 3;
    const initial = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, a, width, height),
      width,
      height,
    );
    setCrop(initial);
  };

  /* ── Change aspect ratio ──────────────────────────────────────────── */
  const changeAspect = (a: number | undefined) => {
    setAspect(a);
    setDoneCrop(undefined);
    const img = imgRef.current;
    if (!img) return;
    const { width, height } = img;
    if (a === undefined) {
      // Free — select 80%
      setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
    } else {
      setCrop(centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, a, width, height),
        width, height,
      ));
    }
  };

  /* ── Crop & upload ────────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!doneCrop || !imgRef.current) {
      toast.error('Finish selecting the crop area first (release the mouse).');
      return;
    }
    if (doneCrop.width < 20 || doneCrop.height < 20) {
      toast.error('Selected area is too small — drag the handles outward.');
      return;
    }
    setUploading(true);
    try {
      const blob = await cropToBlob(imgRef.current, doneCrop, mime);
      const ext  = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      const file = new File([blob], `upload.${ext}`, { type: mime });
      const form = new FormData();
      form.append('file', file);
      form.append('bucket', bucket);
      const res  = await api.post('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);
      const url: string = (res.data as any)?.url ?? '';
      if (url) {
        onChange(url);
        toast.success('Image uploaded');
        setCropOpen(false);
      } else {
        toast.error('No URL returned from server');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const PRESETS: { label: string; value: number | undefined }[] = [
    { label: '4:3',  value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '1:1',  value: 1 },
    { label: 'Free', value: undefined },
  ];

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium block">{label}</label>}

      {/* Preview */}
      {value ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
          <img src={value} alt="Preview" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <button type="button" onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/30
          flex flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground">
          <ImageIcon className="h-8 w-8 opacity-40" />
          <span className="text-sm">No image selected</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading}
          onClick={() => fileRef.current?.click()} className="flex-1">
          {uploading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
            : <><Upload className="h-4 w-4 mr-2" />Upload &amp; Crop</>}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowUrl(v => !v)}>
          URL
        </Button>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden" onChange={handleFileSelect} />

      {showUrl && (
        <Input value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://…" className="text-sm" />
      )}

      {/* ── Crop dialog ─────────────────────────────────────────────── */}
      <Dialog open={cropOpen} onOpenChange={o => { if (!uploading) setCropOpen(o); }}>
        <DialogContent className="max-w-2xl p-4 gap-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CropIcon className="h-4 w-4" /> Crop Image
            </DialogTitle>
          </DialogHeader>

          {/* Ratio presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Ratio:</span>
            {PRESETS.map(({ label: l, value: v }) => {
              const active = v === undefined
                ? aspect === undefined
                : aspect !== undefined && Math.abs(aspect - v) < 0.01;
              return (
                <button key={l} type="button" onClick={() => changeAspect(v)}
                  className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}>
                  {l}
                </button>
              );
            })}
            <button type="button" onClick={() => changeAspect(BUCKET_ASPECT[bucket])}
              className="px-3 py-1 rounded-full border text-xs border-border hover:bg-muted flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>

          {/*
            Crop area.
            - NO overflow:hidden/auto on the wrapper (clips the handles)
            - ReactCrop gets display:block via inline style to override inline-block
            - Image is constrained to max 65vh so it fits on screen
          */}
          <div className="rounded border border-border bg-neutral-900 flex items-start justify-center">
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setDoneCrop(c)}
              aspect={aspect}
              minWidth={40}
              minHeight={40}
              keepSelection
              style={{ display: 'block', width: '100%' }}
            >
              <img
                ref={imgRef}
                src={srcUrl}
                alt="crop-src"
                onLoad={onImgLoad}
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                }}
              />
            </ReactCrop>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag the box to reposition · Drag corner handles to resize · Switch ratio above to change shape
          </p>

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" disabled={uploading}
              onClick={() => setCropOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpload} disabled={uploading || !doneCrop}>
              {uploading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
                : <><CropIcon className="h-4 w-4 mr-2" />Crop &amp; Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
