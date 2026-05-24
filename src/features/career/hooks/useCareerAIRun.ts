import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CareerTool } from './useCareerHistory';

interface RunArgs {
  tool: CareerTool;
  input: Record<string, any>;
}

export interface RunResult {
  ok: true;
  run_id: string;
  title: string;
  output: string;
  model: string;
  used_grant: boolean;
}

export function useCareerAIRun() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation<RunResult, Error, RunArgs>({
    mutationFn: async ({ tool, input }) => {
      const { data, error } = await supabase.functions.invoke('career-ai', {
        body: { tool, input },
      });
      if (error) {
        // FunctionsHttpError exposes context.response sometimes; fall back to message
        const ctx: any = (error as any).context;
        let msg = error.message;
        try {
          if (ctx?.json) {
            const j = await ctx.json();
            msg = j?.message || j?.error || msg;
          }
        } catch { /* ignore */ }
        throw new Error(msg || 'AI request failed');
      }
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      return data as RunResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['career-credits'] });
      qc.invalidateQueries({ queryKey: ['career-history'] });
    },
    onError: (e) => {
      toast({ title: 'AI request failed', description: e.message, variant: 'destructive' });
    },
  });
}
