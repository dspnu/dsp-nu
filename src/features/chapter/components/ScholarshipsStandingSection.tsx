import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, ExternalLink, FileText, Calendar } from 'lucide-react';
import { useMembers } from '@/core/members/hooks/useMembers';
import { useChapterScholarships } from '@/features/chapter/hooks/useChapterScholarships';
import { useMemo } from 'react';

export function ScholarshipsStandingSection() {
  const { data: rows = [], isLoading } = useChapterScholarships();
  const { data: members = [] } = useMembers();

  const nameByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of members) m.set(p.user_id, `${p.first_name} ${p.last_name}`);
    return m;
  }, [members]);

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">Loading scholarships…</p>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Scholarships</span>
          </div>
          <p className="text-sm text-muted-foreground">No scholarships posted yet. Check back later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-0">
        <div className="p-4 sm:p-5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Scholarships & awards</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Opportunities tracked by the chapter. Confirm details with the provider before applying.
          </p>
        </div>
        <ul className="divide-y divide-border/40">
          {rows.map((s) => {
            const winner =
              (s.winner_user_id && nameByUserId.get(s.winner_user_id)) ||
              s.winner_display_name ||
              null;
            return (
              <li key={s.id} className="p-4 sm:p-5 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{s.name}</p>
                    {s.academic_year && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{s.academic_year}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                    {s.amount_summary && (
                      <Badge variant="secondary" className="text-xs font-medium tabular-nums">
                        {s.amount_summary}
                      </Badge>
                    )}
                    {s.due_date && (
                      <Badge variant="outline" className="text-xs gap-1 font-normal">
                        <Calendar className="h-3 w-3" />
                        Due {format(new Date(`${s.due_date}T12:00:00`), 'MMM d, yyyy')}
                      </Badge>
                    )}
                  </div>
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                )}
                {winner && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Recipient: </span>
                    <span className="font-medium">{winner}</span>
                  </p>
                )}
                {s.application_instructions && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{s.application_instructions}</p>
                )}
                <div className="flex flex-wrap gap-3 pt-0.5">
                  {s.info_url && (
                    <a
                      href={s.info_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Details <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {s.application_url && (
                    <a
                      href={s.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Apply <FileText className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
