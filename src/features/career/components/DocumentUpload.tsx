import { useRef, useState } from 'react';
import { FileUp, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { extractDocumentText } from '../lib/extractDocumentText';

interface DocumentUploadProps {
  /** Called with extracted plain text when parsing succeeds. */
  onExtracted: (text: string, fileName: string) => void;
  onClear?: () => void;
  /** Currently attached file name, shown as the active state. */
  attachedName?: string | null;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

export function DocumentUpload({
  onExtracted, onClear, attachedName, disabled, label = 'Upload file', hint,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await extractDocumentText(file);
      onExtracted(text, file.name);
      toast({ title: 'Document loaded', description: `${file.name} (${text.length.toLocaleString()} chars)` });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message ?? 'Could not read file', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (attachedName) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm text-foreground truncate flex-1">{attachedName}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => { onClear?.(); }}
          disabled={disabled}
          aria-label="Remove file"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 h-10"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        <span className="text-sm">{busy ? 'Reading…' : label}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">PDF · DOCX</span>
      </Button>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
