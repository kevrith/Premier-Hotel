// @ts-nocheck
import { useRef, useEffect, useState } from 'react';
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open || !html) return;
    setReady(false);
  }, [open, html]);

  const handleLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
    setReady(true);
  };

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Write content fresh if somehow not ready
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc && doc.body && doc.body.innerHTML === '') {
      doc.open();
      doc.write(html);
      doc.close();
    }
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
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
            onLoad={handleLoad}
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
