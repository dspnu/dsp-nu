import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles, FileText, Linkedin, Megaphone, Mail, MessagesSquare, Target, Briefcase,
} from 'lucide-react';
import { CreditBalanceCard } from '../components/CreditBalanceCard';
import { ResumeReviewTool } from '../components/ResumeReviewTool';
import { LinkedInTool } from '../components/LinkedInTool';
import { PersonalBrandTool } from '../components/PersonalBrandTool';
import { OutreachTool } from '../components/OutreachTool';
import { InterviewPrepTool } from '../components/InterviewPrepTool';
import { JobStrategyTool } from '../components/JobStrategyTool';
import { JobsTab } from '@/features/chapter/components/JobsTab';
import { Card } from '@/components/ui/card';
import { useCareerHistory } from '../hooks/useCareerHistory';
import { formatDistanceToNow } from 'date-fns';
import { isCapabilityEnabled } from '@/config/capabilities';

const TOOL_META: Record<string, { label: string; icon: typeof FileText }> = {
  resume_review: { label: 'Resume', icon: FileText },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  outreach: { label: 'Outreach', icon: Mail },
  interview_prep: { label: 'Interview', icon: MessagesSquare },
  // legacy entries kept so old history rows still render labels
  personal_brand: { label: 'Brand', icon: Megaphone },
  job_strategy: { label: 'Strategy', icon: Target },
};

function OverviewTab({ onJump }: { onJump: (key: string) => void }) {
  const { data: history } = useCareerHistory(undefined, 6);

  const tools = [
    { key: 'resume', label: 'Resume Review', icon: FileText, desc: 'Get line-by-line feedback' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, desc: 'Sharpen your profile' },
    { key: 'brand', label: 'Personal Brand', icon: Megaphone, desc: 'Statement + bio variants' },
    { key: 'outreach', label: 'Outreach', icon: Mail, desc: 'Cold messages that land' },
    { key: 'interview', label: 'Interview Prep', icon: MessagesSquare, desc: 'Likely Q&A + STAR' },
    { key: 'strategy', label: 'Job Strategy', icon: Target, desc: '30/60/90 day plan' },
  ];

  return (
    <div className="space-y-5">
      <CreditBalanceCard />

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> AI Tools
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {tools.map(({ key, label, icon: Icon, desc }) => (
            <button
              key={key}
              onClick={() => onJump(key)}
              className="text-left p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/30 active:scale-[0.98] transition-all"
            >
              <Icon className="h-5 w-5 text-primary mb-2" />
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {!!history?.length && (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent activity</h3>
          <ul className="space-y-1.5">
            {history.map((r) => {
              const meta = TOOL_META[r.tool] ?? { label: r.tool, icon: Sparkles };
              const Icon = meta.icon;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                  <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.title || meta.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {meta.label} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function CareerHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'overview');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
  }, [searchParams]);

  const handleSet = (v: string) => {
    setTab(v);
    setSearchParams((sp) => {
      sp.set('tab', v);
      return sp;
    }, { replace: true });
  };

  const tabs = useMemo(() => {
    const base = [
      { key: 'overview', label: 'Overview', icon: Sparkles },
      { key: 'resume', label: 'Resume', icon: FileText },
      { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
      { key: 'brand', label: 'Brand', icon: Megaphone },
      { key: 'outreach', label: 'Outreach', icon: Mail },
      { key: 'interview', label: 'Interview', icon: MessagesSquare },
      { key: 'strategy', label: 'Strategy', icon: Target },
    ];
    if (isCapabilityEnabled('jobBoard')) {
      base.push({ key: 'jobs', label: 'Jobs', icon: Briefcase });
    }
    return base;
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Career Hub"
        description="AI-powered career tools — 1 credit per week, reset Monday."
      />

      <Tabs value={tab} onValueChange={handleSet} className="space-y-5">
        <div className="w-full overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="inline-flex h-10 w-max min-w-full sm:min-w-0 flex-nowrap justify-start gap-0.5 rounded-md bg-muted/70 p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} className="shrink-0 gap-1.5 px-3">
                <Icon className="h-4 w-4 opacity-80 hidden sm:block" />
                <span className="whitespace-nowrap">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0"><OverviewTab onJump={handleSet} /></TabsContent>
        <TabsContent value="resume" className="mt-0"><ResumeReviewTool /></TabsContent>
        <TabsContent value="linkedin" className="mt-0"><LinkedInTool /></TabsContent>
        <TabsContent value="brand" className="mt-0"><PersonalBrandTool /></TabsContent>
        <TabsContent value="outreach" className="mt-0"><OutreachTool /></TabsContent>
        <TabsContent value="interview" className="mt-0"><InterviewPrepTool /></TabsContent>
        <TabsContent value="strategy" className="mt-0"><JobStrategyTool /></TabsContent>
        {isCapabilityEnabled('jobBoard') && (
          <TabsContent value="jobs" className="mt-0"><JobsTab /></TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
}
