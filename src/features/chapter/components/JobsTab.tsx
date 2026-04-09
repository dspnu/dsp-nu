import { useState, useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bookmark, Briefcase, Search } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthContext';
import { useJobs, useJobBookmarks } from '@/features/jobs/hooks/useJobs';
import { JobForm } from '@/features/jobs/components/JobForm';
import { JobCard } from '@/features/jobs/components/JobCard';

const jobTypes = [
  { value: 'all', label: 'All types' },
  { value: 'internship', label: 'Internship' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
];

export function JobsTab() {
  const { user } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { bookmarks, toggleBookmark } = useJobBookmarks(user?.id ?? '');
  const [jobSearch, setJobSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredJobs = useMemo(
    () =>
      jobs?.filter(job => {
        const q = jobSearch.toLowerCase().trim();
        const matchesSearch =
          q === '' ||
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          (job.description?.toLowerCase().includes(q) ?? false) ||
          job.tags?.some(tag => tag.toLowerCase().includes(q));
        const matchesType = typeFilter === 'all' || job.job_type === typeFilter;
        return matchesSearch && matchesType;
      }) ?? [],
    [jobs, jobSearch, typeFilter]
  );

  const bookmarkedInFilter = useMemo(
    () => filteredJobs.filter(job => bookmarks.includes(job.id)),
    [filteredJobs, bookmarks]
  );

  const listEmptyAfterFilter = jobs && jobs.length > 0 && filteredJobs.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search roles, companies, tags…"
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[11rem]">
              <SelectValue placeholder="Job type" />
            </SelectTrigger>
            <SelectContent>
              {jobTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="shrink-0 flex sm:justify-end">
            <JobForm />
          </div>
        </div>
      </div>

      {jobsLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-36 animate-pulse bg-muted/80" />
          ))}
        </div>
      ) : !jobs?.length ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-8">
          <EmptyState
            icon={Briefcase}
            title="No job postings yet"
            description="Internships and full-time roles shared by the chapter will show up here."
          />
        </div>
      ) : listEmptyAfterFilter ? (
        <EmptyState
          icon={Briefcase}
          title="No matches"
          description="Try another search or change the job type filter."
        />
      ) : (
        <Tabs defaultValue="all" className="w-full space-y-4">
          <TabsList className="grid h-9 w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="all" className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5 opacity-80" />
              All
              <span className="text-muted-foreground tabular-nums">({filteredJobs.length})</span>
            </TabsTrigger>
            <TabsTrigger value="bookmarked" className="gap-1.5">
              <Bookmark className="h-3.5 w-3.5 opacity-80" />
              Saved
              <span className="text-muted-foreground tabular-nums">({bookmarkedInFilter.length})</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isBookmarked={bookmarks.includes(job.id)}
                  onToggleBookmark={() => toggleBookmark(job.id)}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="bookmarked" className="mt-0">
            {bookmarkedInFilter.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved jobs in this view"
                description="Save roles from the All tab, or clear filters to see every bookmark."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {bookmarkedInFilter.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isBookmarked
                    onToggleBookmark={() => toggleBookmark(job.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
