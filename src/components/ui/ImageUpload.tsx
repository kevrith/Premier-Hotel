import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
  /** Current image URL (displayed as preview) */
  value: string;
  /** Called with the new URL after upload or manual entry */
  onChange: (url: string) => void;
  /** Supabase Storage bucket — 'menu-images' | 'room-images' */
  bucket?: 'menu-images' | 'room-images';
  /** Label shown above the component */
  label?: string;
}

export default function ImageUpload({
  value,
  onChange,
  bucket = 'menu-images',
  label = 'Image',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);

      // Use the raw axios instance to post multipart data
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as any);

      const data = (res.data as any);
      const url: string = data?.url || (typeof data === 'string' ? data : '');
      if (url) {
        onChange(url);
        toast.success('Image uploaded');
      } else {
        toast.error('Upload succeeded but no URL returned');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
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
              (e.target as HTMLImageElement).src = '';
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
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
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput((v) => !v)}
        >
          URL
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />

      {/* Optional URL fallback */}
      {showUrlInput && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="text-sm"
        />
      )}
    </div>
  );
}
