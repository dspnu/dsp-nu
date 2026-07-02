import { ReactNode, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, History, Trash2, Loader2, Copy, Download } from 'lucide-react';
import { useCareerAIRun } from '../hooks/useCareerAIRun';
import { useCareerHistory, useDeleteCareerRun, type CareerTool } from '../hooks/useCareerHistory';
import { useCareerCredits } from '../hooks/useCareerCredits';
import { RichResultView } from './RichResultView';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { RequestHelpDialog } from './RequestHelpDialog';
import { LifeBuoy } from 'lucide-react';

interface AIToolShellProps {
  tool: CareerTool;
  title: string;
  description: string;
  icon: ReactNode;
  /** The intake form. Receives a `disabled` flag while running. */
  renderForm: (args: { disabled: boolean }) => ReactNode;
  /** Validate + return the input object that the edge function will receive. Return null to block submit. */
  collectInput: () => Record<string, any> | null;
}

export function AIToolShell({
  tool, title, description, icon, renderForm, collectInput,
}: AIToolShellProps) {
  const run = useCareerAIRun();
  const credits = useCareerCredits();
  const history = useCareerHistory(tool, 10);
  const deleteRun = useDeleteCareerRun();
  const [openRun, setOpenRun] = useState<any | null>(null);

  const total = credits.data?.total ?? 0;
  const result = run.data?.output;
  const canRun = total > 0 && !run.isPending;

  const handleRun = () => {
    const input = collectInput();
    if (!input) return;
    run.mutate({ tool, input });
  };

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        <div className="space-y-3">{renderForm({ disabled: run.isPending })}</div>

        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border/60 flex-wrap">
          <div className="text-xs text-muted-foreground">
            Cost: <span className="font-medium text-foreground">1 credit</span> · You have{' '}
            <span className="font-medium text-foreground tabular-nums">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <RequestHelpDialog
              tool={tool}
              toolLabel={title}
              defaultSubject={`Help with ${title}`}
              trigger={
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <LifeBuoy className="h-3.5 w-3.5 mr-1.5" /> Ask a chair
                </Button>
              }
            />
            <Button onClick={handleRun} disabled={!canRun} size="sm">
              {run.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Generating…</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate</>
              )}
            </Button>
          </div>
        </div>
        {total === 0 && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            No credits left this week. Resets Monday. You can still request help from a chair above.
          </p>
        )}
      </Card>

      {result && (
        <Card className="p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">Latest result</Badge>
              {run.data?.model && (
                <span className="text-[10px] text-muted-foreground font-mono">{run.data.model}</span>
              )}
            </div>
            <ResultActions text={result} title={title} />
          </div>
          <RichResultView tool={tool} source={result} />
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">History</h3>
        </div>
        {history.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : !history.data?.length ? (
          <p className="text-sm text-muted-foreground">No past runs yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {history.data.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 hover:bg-muted/50">
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => setOpenRun(r)}
                >
                  <div className="text-sm font-medium text-foreground truncate">{r.title || 'Untitled'}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteRun.mutate(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={!!openRun} onOpenChange={() => setOpenRun(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openRun?.title}</DialogTitle>
          </DialogHeader>
          {openRun && <RichResultView tool={tool} source={openRun.output} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultActions({ text, title }: { text: string; title: string }) {
  const { toast } = useToast();
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => {
          navigator.clipboard.writeText(text);
          toast({ title: 'Copied result' });
        }}
      >
        <Copy className="h-3 w-3 mr-1" /> Copy
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => {
          const blob = new Blob([text], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        <Download className="h-3 w-3 mr-1" /> Save
      </Button>
    </div>
  );
}

