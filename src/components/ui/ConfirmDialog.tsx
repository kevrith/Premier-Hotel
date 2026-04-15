import { useState, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';

type Variant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  /** If set, renders an input and requires the user to type this value to confirm */
  requireInput?: string;
  requireInputLabel?: string;
  requireInputPlaceholder?: string;
}

interface PromptOptions {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type Resolver<T> = (value: T) => void;

interface DialogState {
  type: 'confirm' | 'prompt';
  options: ConfirmOptions | PromptOptions;
  resolve: Resolver<boolean | string | null>;
}

// ── Singleton state shared across the app ────────────────────────────────────

let _setDialog: ((state: DialogState | null) => void) | null = null;

function openConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    _setDialog?.({ type: 'confirm', options, resolve: resolve as Resolver<boolean | string | null> });
  });
}

function openPrompt(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    _setDialog?.({ type: 'prompt', options, resolve: resolve as Resolver<boolean | string | null> });
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export const confirmDialog = {
  /** Show a confirmation dialog. Returns true if confirmed, false if cancelled. */
  confirm: openConfirm,
  /** Show a prompt dialog. Returns the entered string or null if cancelled. */
  prompt: openPrompt,
};

// ── Variant config ────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<Variant, { icon: React.ReactNode; confirmClass: string }> = {
  danger:  { icon: <Trash2 className="h-5 w-5 text-destructive" />,      confirmClass: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' },
  warning: { icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white' },
  info:    { icon: <Info className="h-5 w-5 text-blue-500" />,           confirmClass: '' },
  success: { icon: <CheckCircle className="h-5 w-5 text-green-500" />,   confirmClass: 'bg-green-600 hover:bg-green-700 text-white' },
};

// ── Provider (mount once in App.tsx) ─────────────────────────────────────────

export function ConfirmDialogProvider() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Register the setter so the imperative API can open dialogs
  _setDialog = setDialog;

  const close = useCallback(() => {
    setDialog(null);
    setInputValue('');
  }, []);

  const handleConfirm = useCallback(() => {
    if (!dialog) return;
    if (dialog.type === 'confirm') {
      const opts = dialog.options as ConfirmOptions;
      if (opts.requireInput && inputValue !== opts.requireInput) return;
      dialog.resolve(true);
    } else {
      dialog.resolve(inputValue || null);
    }
    close();
  }, [dialog, inputValue, close]);

  const handleCancel = useCallback(() => {
    if (!dialog) return;
    dialog.resolve(dialog.type === 'confirm' ? false : null);
    close();
  }, [dialog, close]);

  if (!dialog) return null;

  const isConfirm = dialog.type === 'confirm';
  const opts = dialog.options as ConfirmOptions & PromptOptions;
  const variant: Variant = (opts as ConfirmOptions).variant ?? 'info';
  const cfg = VARIANT_CONFIG[variant];

  const requireInput = isConfirm ? (opts as ConfirmOptions).requireInput : undefined;
  const confirmDisabled = requireInput ? inputValue !== requireInput : false;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isConfirm && cfg.icon}
            {opts.title}
          </DialogTitle>
          {opts.description && (
            <DialogDescription>{opts.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Confirm with required input (e.g. type item name to delete) */}
        {isConfirm && requireInput && (
          <div className="space-y-2 py-2">
            <Label className="text-sm">
              {(opts as ConfirmOptions).requireInputLabel ?? `Type "${requireInput}" to confirm`}
            </Label>
            <Input
              ref={inputRef}
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !confirmDisabled) handleConfirm(); }}
              placeholder={(opts as ConfirmOptions).requireInputPlaceholder ?? requireInput}
            />
          </div>
        )}

        {/* Prompt input */}
        {!isConfirm && (
          <div className="space-y-2 py-2">
            {opts.label && <Label>{opts.label}</Label>}
            <Input
              ref={inputRef}
              autoFocus
              defaultValue={opts.defaultValue ?? ''}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              placeholder={opts.placeholder}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            {opts.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            className={isConfirm && variant !== 'info' ? cfg.confirmClass : ''}
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {opts.confirmLabel ?? (isConfirm ? 'Confirm' : 'OK')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
