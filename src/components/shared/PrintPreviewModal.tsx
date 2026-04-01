// @ts-nocheck
import { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  html: string;
  title: string;
}

/**
 * In-app print preview modal.
 * Renders receipt HTML in an iframe — no external popup window.
 * User clicks Print to send to printer, or Close to cancel.
 */
export function PrintPreviewModal({ open, onClose, html, title }: PrintPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open || !html || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [open, html]);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Receipt preview */}
        <div className="bg-white overflow-auto" style={{ maxHeight: '70vh' }}>
          <iframe
            ref={iframeRef}
            title={title}
            className="w-full border-0"
            style={{ minHeight: '400px', height: '60vh' }}
            sandbox="allow-modals allow-scripts"
          />
        </div>

        <div className="flex gap-2 p-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
          <Button size="sm" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
