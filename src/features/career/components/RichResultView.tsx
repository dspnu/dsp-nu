import { useMemo, useState } from 'react';
import {
  CheckCircle2, AlertTriangle, Sparkles, Copy, ChevronDown, Quote, Circle,
  Linkedin as LinkedinIcon, Mail, MessagesSquare, Target, Megaphone, FileText, ListChecks,
  Eye, Zap, TrendingUp, MessageCircle, Send, ArrowRight, Lightbulb, HelpCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MarkdownView } from './MarkdownView';
import { useToast } from '@/hooks/use-toast';
import type { CareerTool } from '../hooks/useCareerHistory';

interface RichResultViewProps {
  tool: CareerTool;
  source: string;
}

/**
 * Parse a leading ```json fenced block if present. Returns { data, body } where
 * body is the remaining text after the JSON block (or the original source if not parseable).
 */
function parseStructured(source: string): { data: any | null; body: string } {
  const trimmed = source.trimStart();
  const fenceMatch = trimmed.match(/^```json\s*([\s\S]*?)```\s*/i);
  if (fenceMatch) {
    try {
      const data = JSON.parse(fenceMatch[1]);
      const body = trimmed.slice(fenceMatch[0].length).trim();
      return { data, body };
    } catch {
      /* fall through */
    }
  }
  // Some models put the JSON object inline without a fence
  if (trimmed.startsWith('{')) {
    const end = findMatchingBrace(trimmed);
    if (end > 0) {
      try {
        const data = JSON.parse(trimmed.slice(0, end));
        const body = trimmed.slice(end).trim();
        return { data, body };
      } catch { /* fall through */ }
    }
  }
  return { data: null, body: source };
}

function findMatchingBrace(s: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

export function RichResultView({ tool, source }: RichResultViewProps) {
  const { data, body } = useMemo(() => parseStructured(source), [source]);

  if (!data) {
    return <MarkdownView source={source} />;
  }

  return (
    <div className="space-y-4">
      {tool === 'resume_review' && <ResumeResult data={data} />}
      {tool === 'linkedin' && <LinkedInResult data={data} />}
      {tool === 'personal_brand' && <BrandResult data={data} />}
      {tool === 'outreach' && <OutreachResult data={data} />}
      {tool === 'interview_prep' && <InterviewResult data={data} />}
      {tool === 'job_strategy' && <StrategyResult data={data} />}
      {body && (
        <Collapse title="More detail">
          <MarkdownView source={body} />
        </Collapse>
      )}
    </div>
  );
}

/* ------------------------------- shared bits ------------------------------ */

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const { toast } = useToast();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied' });
      }}
    >
      <Copy className="h-3 w-3 mr-1" /> {label}
    </Button>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
    </div>
  );
}

function Tile({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'success' | 'warn' | 'primary' }) {
  const tones: Record<string, string> = {
    default: 'bg-card border-border/60',
    success: 'bg-emerald-500/5 border-emerald-500/20',
    warn: 'bg-amber-500/5 border-amber-500/20',
    primary: 'bg-primary/5 border-primary/20',
  };
  return <div className={`rounded-lg border p-3 ${tones[tone]}`}>{children}</div>;
}

function Collapse({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-3 border-t border-border/60">{children}</div>}
    </div>
  );
}

function asArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

/* --------------------------------- resume --------------------------------- */

function ResumeResult({ data }: { data: any }) {
  const score = typeof data.score === 'number' ? Math.max(0, Math.min(100, data.score)) : null;
  const strengths = asArray<string>(data.strengths);
  const improvements = asArray<any>(data.improvements);
  const rewrites = asArray<any>(data.rewrites);
  const keywords = asArray<string>(data.keywords);
  const polished = typeof data.polishedSummary === 'string' ? data.polishedSummary : null;
  const summary = typeof data.summary === 'string' ? data.summary : null;

  return (
    <div className="space-y-4">
      {score !== null && (
        <Tile tone="primary">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall</div>
              <div className="text-3xl font-semibold tabular-nums text-foreground">{score}<span className="text-base text-muted-foreground">/100</span></div>
            </div>
            <div className="flex-1 max-w-xs">
              <Progress value={score} className="h-2" />
            </div>
          </div>
          {summary && <p className="text-sm text-foreground/90 mt-3">{summary}</p>}
        </Tile>
      )}

      {strengths.length > 0 && (
        <div>
          <SectionTitle icon={CheckCircle2}>Strengths</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-2">
            {strengths.map((s, i) => (
              <Tile key={i} tone="success">
                <div className="flex gap-2 text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {improvements.length > 0 && (
        <div>
          <SectionTitle icon={AlertTriangle}>Improvements</SectionTitle>
          <div className="space-y-2">
            {improvements.map((imp, i) => (
              <Tile key={i} tone="warn">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{imp.title ?? imp.heading ?? 'Suggestion'}</div>
                    {imp.detail && <p className="text-sm text-foreground/80 mt-0.5">{imp.detail}</p>}
                  </div>
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {rewrites.length > 0 && (
        <div>
          <SectionTitle icon={Sparkles}>Suggested rewrites</SectionTitle>
          <div className="space-y-2">
            {rewrites.map((rw, i) => (
              <Tile key={i}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Before</div>
                    <p className="text-sm text-foreground/70 line-through decoration-muted-foreground/40">{rw.before}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] uppercase tracking-wider text-primary">After</div>
                      <CopyButton text={rw.after ?? ''} />
                    </div>
                    <p className="text-sm text-foreground font-medium">{rw.after}</p>
                  </div>
                </div>
                {rw.reason && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/60">Why: {rw.reason}</p>}
              </Tile>
            ))}
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div>
          <SectionTitle icon={Target}>ATS keywords</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
            ))}
          </div>
        </div>
      )}

      {polished && (
        <div>
          <SectionTitle icon={Quote}>Polished summary</SectionTitle>
          <Tile tone="primary">
            <p className="text-sm text-foreground italic">"{polished}"</p>
            <div className="flex justify-end mt-2"><CopyButton text={polished} /></div>
          </Tile>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- linkedin -------------------------------- */

function ScoreRing({ value, size = 72 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color = v >= 80 ? 'hsl(var(--primary))' : v >= 60 ? 'hsl(38 92% 50%)' : 'hsl(0 72% 51%)';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold tabular-nums text-foreground">{v}</span>
      </div>
    </div>
  );
}

function LinkedInResult({ data }: { data: any }) {
  const overall = typeof data.overallScore === 'number' ? data.overallScore : null;
  const summary = typeof data.summary === 'string' ? data.summary : null;
  const sectionScores = asArray<any>(data.sectionScores);
  const headlines = asArray<any>(data.headlines);
  const aboutObj = data.about && typeof data.about === 'object' ? data.about : null;
  // Back-compat: older runs returned `about` as a string
  const aboutString = typeof data.about === 'string' ? data.about : null;
  const exp = asArray<any>(data.experienceRewrites);
  const keywordGaps = asArray<any>(data.keywordGaps);
  const legacyKeywords = asArray<string>(data.keywords);
  const checklist = asArray<any>(data.checklist);
  const recruiterTips = asArray<string>(data.recruiterTips);

  const [activeHeadline, setActiveHeadline] = useState(0);

  return (
    <div className="space-y-5">
      {/* Hero scorecard */}
      {overall !== null && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <ScoreRing value={overall} size={84} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                <LinkedinIcon className="h-3 w-3" /> Profile audit
              </div>
              <div className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                {overall >= 80 ? 'Strong profile' : overall >= 60 ? 'Solid, with room to grow' : 'Needs work'}
              </div>
              {summary && <p className="text-xs sm:text-sm text-foreground/80 mt-1.5 line-clamp-3">{summary}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Section scores grid */}
      {sectionScores.length > 0 && (
        <div>
          <SectionTitle icon={TrendingUp}>Section scores</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sectionScores.map((s, i) => {
              const score = Math.max(0, Math.min(100, Number(s.score ?? 0)));
              const tone = score >= 80 ? 'emerald' : score >= 60 ? 'amber' : 'rose';
              const colors: Record<string, string> = {
                emerald: 'text-emerald-500',
                amber: 'text-amber-500',
                rose: 'text-rose-500',
              };
              return (
                <div key={i} className="rounded-lg border border-border/60 bg-card p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-foreground truncate">{s.section}</span>
                    <span className={`text-sm font-semibold tabular-nums ${colors[tone]}`}>{score}</span>
                  </div>
                  <Progress value={score} className="h-1.5 mb-1.5" />
                  {s.verdict && <p className="text-[11px] text-muted-foreground line-clamp-2">{s.verdict}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Headline picker */}
      {headlines.length > 0 && (
        <div>
          <SectionTitle icon={Zap}>Headline options</SectionTitle>
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {headlines.map((h, i) => (
              <button
                key={i}
                onClick={() => setActiveHeadline(i)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  activeHeadline === i
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border/60 hover:text-foreground'
                }`}
              >
                {typeof h === 'object' ? (h.angle ?? `Option ${i + 1}`) : `Option ${i + 1}`}
              </button>
            ))}
          </div>
          <Tile tone="primary">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-foreground font-medium leading-relaxed">
                {typeof headlines[activeHeadline] === 'object'
                  ? headlines[activeHeadline].text
                  : headlines[activeHeadline]}
              </p>
              <CopyButton
                text={typeof headlines[activeHeadline] === 'object'
                  ? headlines[activeHeadline].text ?? ''
                  : String(headlines[activeHeadline])}
              />
            </div>
          </Tile>
        </div>
      )}

      {/* About: before/after */}
      {(aboutObj || aboutString) && (
        <div>
          <SectionTitle icon={FileText}>About section</SectionTitle>
          {aboutObj ? (
            <div className="grid md:grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Before</div>
                <p className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed line-clamp-[12]">
                  {aboutObj.before || 'Not provided'}
                </p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-primary font-medium">After</div>
                  <CopyButton text={aboutObj.after ?? ''} />
                </div>
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{aboutObj.after}</p>
              </div>
            </div>
          ) : (
            <Tile tone="primary">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{aboutString}</p>
              <div className="flex justify-end mt-2"><CopyButton text={aboutString ?? ''} /></div>
            </Tile>
          )}
        </div>
      )}

      {/* Experience rewrites */}
      {exp.length > 0 && (
        <div>
          <SectionTitle icon={Sparkles}>Experience rewrites</SectionTitle>
          <div className="space-y-2">
            {exp.map((rw, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-card overflow-hidden">
                {rw.role && (
                  <div className="px-3 py-1.5 bg-muted/50 border-b border-border/60 text-[11px] font-medium text-foreground">
                    {rw.role}
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground line-through decoration-muted-foreground/40">{rw.before}</p>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground font-medium flex-1">{rw.after}</p>
                    <CopyButton text={rw.after ?? ''} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyword gaps */}
      {(keywordGaps.length > 0 || legacyKeywords.length > 0) && (
        <div>
          <SectionTitle icon={Target}>Keyword gaps</SectionTitle>
          {keywordGaps.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-1.5">
              {keywordGaps.map((k, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border/60 bg-card p-2.5">
                  <Badge variant="default" className="text-[10px] shrink-0">{k.keyword}</Badge>
                  {k.why && <span className="text-[11px] text-muted-foreground">{k.why}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {legacyKeywords.map((k, i) => <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>)}
            </div>
          )}
        </div>
      )}

      {/* Checklist with priority */}
      {checklist.length > 0 && (
        <div>
          <SectionTitle icon={ListChecks}>Profile checklist</SectionTitle>
          <ChecklistView items={checklist} />
        </div>
      )}

      {/* Recruiter tips */}
      {recruiterTips.length > 0 && (
        <div>
          <SectionTitle icon={Eye}>Recruiter visibility</SectionTitle>
          <div className="space-y-1.5">
            {recruiterTips.map((t, i) => (
              <Tile key={i}>
                <div className="flex gap-2 text-sm text-foreground/90">
                  <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{t}</span>
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistView({ items }: { items: any[] }) {
  const [doneState, setDoneState] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(items.map((c, i) => [i, typeof c === 'object' ? !!c.done : false]))
  );
  const completed = Object.values(doneState).filter(Boolean).length;
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0;
  const priorityColor: Record<string, string> = {
    high: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Progress value={pct} className="h-2 flex-1" />
        <span className="text-xs font-medium text-foreground tabular-nums">{completed}/{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((c, i) => {
          const label = typeof c === 'string' ? c : c.item ?? c.label ?? '';
          const priority = (typeof c === 'object' && c.priority) ? String(c.priority).toLowerCase() : null;
          const done = doneState[i];
          return (
            <button
              key={i}
              onClick={() => setDoneState(s => ({ ...s, [i]: !s[i] }))}
              className="w-full flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2 hover:bg-muted/50 transition-colors text-left"
            >
              {done
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
              <span className={`flex-1 text-sm ${done ? 'text-muted-foreground line-through' : 'text-foreground/90'}`}>
                {label}
              </span>
              {priority && priorityColor[priority] && (
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityColor[priority]}`}>
                  {priority}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- brand --------------------------------- */

function BrandResult({ data }: { data: any }) {
  const statement = typeof data.statement === 'string' ? data.statement : null;
  const bios = (data.bios && typeof data.bios === 'object') ? data.bios : {};
  const pillars = asArray<any>(data.contentPillars);
  const voice = data.voice && typeof data.voice === 'object' ? data.voice : null;

  return (
    <div className="space-y-4">
      {statement && (
        <Tile tone="primary">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Brand statement</div>
          <p className="text-lg text-foreground font-medium leading-snug">"{statement}"</p>
          <div className="flex justify-end mt-2"><CopyButton text={statement} /></div>
        </Tile>
      )}

      {Object.keys(bios).length > 0 && (
        <div>
          <SectionTitle icon={Megaphone}>Bio variants</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(bios).map(([key, val]) => (
              <Tile key={key}>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{key}</Badge>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{String(val).length} ch</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{String(val)}</p>
                <div className="flex justify-end mt-1"><CopyButton text={String(val)} /></div>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {pillars.length > 0 && (
        <div>
          <SectionTitle icon={Sparkles}>Content pillars</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-2">
            {pillars.map((p, i) => (
              <Tile key={i}>
                <div className="text-sm font-medium text-foreground">{p.title ?? `Pillar ${i + 1}`}</div>
                {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
              </Tile>
            ))}
          </div>
        </div>
      )}

      {voice && (
        <div className="grid sm:grid-cols-2 gap-2">
          {asArray<string>(voice.values).length > 0 && (
            <Tile>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Values</div>
              <div className="flex flex-wrap gap-1.5">
                {asArray<string>(voice.values).map((v, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                ))}
              </div>
            </Tile>
          )}
          {asArray<string>(voice.tones).length > 0 && (
            <Tile>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Voice & tone</div>
              <div className="flex flex-wrap gap-1.5">
                {asArray<string>(voice.tones).map((v, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{v}</Badge>
                ))}
              </div>
            </Tile>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- outreach -------------------------------- */

function OutreachResult({ data }: { data: any }) {
  const variants = asArray<any>(data.variants);
  const tips = asArray<string>(data.tips);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = variants[activeIdx];

  const channelIcon: Record<string, any> = {
    linkedin: LinkedinIcon,
    email: Mail,
    followup: Send,
  };

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <div>
          <SectionTitle icon={MessageCircle}>Pick a message</SectionTitle>

          {/* Variant picker */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {variants.map((v, i) => {
              const Icon = channelIcon[String(v.channel ?? '').toLowerCase()] ?? Mail;
              const isActive = i === activeIdx;
              return (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`rounded-lg border p-2.5 text-left transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/60 bg-card hover:border-border'
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-[11px] font-medium text-foreground capitalize truncate">{v.channel ?? `Variant ${i + 1}`}</div>
                  {v.angle && <div className="text-[10px] text-muted-foreground truncate">{v.angle}</div>}
                </button>
              );
            })}
          </div>

          {/* Phone-style message preview */}
          {active && (
            <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-muted/30 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/40">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = channelIcon[String(active.channel ?? '').toLowerCase()] ?? Mail;
                    return <Icon className="h-3.5 w-3.5 text-primary" />;
                  })()}
                  <span className="text-[11px] font-medium text-foreground capitalize">{active.channel ?? 'Message'}</span>
                  {active.angle && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{active.angle}</Badge>
                  )}
                </div>
                <CopyButton
                  text={[active.subject ? `Subject: ${active.subject}` : '', active.message].filter(Boolean).join('\n\n')}
                  label="Copy"
                />
              </div>
              {active.subject && (
                <div className="px-3.5 py-2 border-b border-border/40">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">Subject</span>
                  <span className="text-sm font-medium text-foreground">{active.subject}</span>
                </div>
              )}
              <div className="p-3.5">
                <div className="rounded-2xl rounded-tl-sm bg-primary/10 text-foreground px-3.5 py-2.5 max-w-[92%]">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{active.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tips.length > 0 && (
        <div>
          <SectionTitle icon={Lightbulb}>Tips for this contact</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {tips.map((t, i) => (
              <div key={i} className="flex gap-2 rounded-lg border border-border/60 bg-card p-2.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-foreground/90">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- interview ------------------------------- */

function InterviewResult({ data }: { data: any }) {
  const behavioral = asArray<any>(data.behavioral);
  const technical = asArray<any>(data.technical);
  const star = data.starAnswer && typeof data.starAnswer === 'object' ? data.starAnswer : null;
  const ask = asArray<string>(data.questionsToAsk);

  return (
    <div className="space-y-4">
      {behavioral.length > 0 && (
        <div>
          <SectionTitle icon={MessagesSquare}>Behavioral questions</SectionTitle>
          <div className="space-y-1.5">
            {behavioral.map((q, i) => (
              <Collapse key={i} title={typeof q === 'string' ? q : q.question ?? `Question ${i + 1}`}>
                {typeof q === 'object' && q.guidance && (
                  <p className="text-sm text-foreground/90">{q.guidance}</p>
                )}
              </Collapse>
            ))}
          </div>
        </div>
      )}

      {technical.length > 0 && (
        <div>
          <SectionTitle icon={Target}>Technical / case</SectionTitle>
          <div className="space-y-1.5">
            {technical.map((q, i) => (
              <Collapse key={i} title={typeof q === 'string' ? q : q.question ?? `Question ${i + 1}`}>
                {typeof q === 'object' && (q.focus || q.guidance) && (
                  <p className="text-sm text-foreground/90">{q.focus ?? q.guidance}</p>
                )}
              </Collapse>
            ))}
          </div>
        </div>
      )}

      {star && (
        <div>
          <SectionTitle icon={Sparkles}>STAR answer template</SectionTitle>
          <Tile tone="primary">
            {star.question && <p className="text-sm font-medium text-foreground mb-3">{star.question}</p>}
            <div className="space-y-2">
              {(['situation', 'task', 'action', 'result'] as const).map((k) =>
                star[k] ? (
                  <div key={k} className="grid grid-cols-[60px_1fr] gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase justify-center self-start">{k}</Badge>
                    <p className="text-sm text-foreground/90">{star[k]}</p>
                  </div>
                ) : null
              )}
            </div>
          </Tile>
        </div>
      )}

      {ask.length > 0 && (
        <div>
          <SectionTitle icon={Quote}>Ask the interviewer</SectionTitle>
          <div className="space-y-1.5">
            {ask.map((q, i) => (
              <Tile key={i}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground/90">{q}</p>
                  <CopyButton text={q} />
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- strategy ------------------------------- */

function StrategyResult({ data }: { data: any }) {
  const plan = data.plan && typeof data.plan === 'object' ? data.plan : null;
  const weekly = data.weeklyTargets && typeof data.weeklyTargets === 'object' ? data.weeklyTargets : null;
  const criteria = asArray<string>(data.companyCriteria);
  const pitfalls = asArray<string>(data.pitfalls);

  return (
    <div className="space-y-4">
      {plan && (
        <div>
          <SectionTitle icon={Target}>30 / 60 / 90 day plan</SectionTitle>
          <div className="grid sm:grid-cols-3 gap-2">
            {(['day30', 'day60', 'day90'] as const).map((k, idx) => (
              <Tile key={k} tone={idx === 0 ? 'primary' : 'default'}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Day {(idx + 1) * 30}
                </div>
                <ul className="space-y-1.5">
                  {asArray<string>(plan[k]).map((item, i) => (
                    <li key={i} className="flex gap-1.5 text-sm text-foreground/90">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {weekly && (
        <div>
          <SectionTitle icon={Sparkles}>Weekly targets</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(weekly).map(([k, v]) => (
              <Tile key={k}>
                <div className="text-3xl font-semibold tabular-nums text-foreground">{String(v)}</div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5">{k}</div>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {criteria.length > 0 && (
        <div>
          <SectionTitle icon={ListChecks}>Company criteria</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {criteria.map((c, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
            ))}
          </div>
        </div>
      )}

      {pitfalls.length > 0 && (
        <div>
          <SectionTitle icon={AlertTriangle}>Pitfalls to avoid</SectionTitle>
          <div className="space-y-1.5">
            {pitfalls.map((p, i) => (
              <Tile key={i} tone="warn">
                <div className="flex gap-2 text-sm text-foreground/90">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
