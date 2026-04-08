import { useState, useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Search } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthContext';
import { useJobs, useJobBookmarks } from '@/features/jobs/hooks/useJobs';
import { JobForm } from '@/features/jobs/components/JobForm';
import { JobCard } from '@/features/jobs/components/JobCard';

const jobTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'internship', label: 'Internship' },
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
];

export function JobsTab() {
  const { user } = useAuth();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { bookmarks, toggleBookmark } = useJobBookmarks(user?.id ?? '');
  const [jobSearch, setJobSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredJobs = useMemo(() =>
    jobs?.filter(job => {
      const matchesSearch =
        job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
        job.company.toLowerCase().includes(jobSearch.toLowerCase()) ||
        job.description?.toLowerCase().includes(jobSearch.toLowerCase()) ||
        job.tags?.some(tag => tag.toLowerCase().includes(jobSearch.toLowerCase()));
      const matchesType = typeFilter === 'all' || job.job_type === typeFilter;
      return matchesSearch && matchesType;
    }) ?? [],
    [jobs, jobSearch, typeFilter]
  );

  const bookmarkedJobs = useMemo(
    () => filteredJobs.filter(job => bookmarks.includes(job.id)),
    [filteredJobs, bookmarks]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <JobForm />
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs, companies, or tags..." value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            {jobTypes.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      {jobsLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Jobs ({filteredJobs.length})</TabsTrigger>
            <TabsTrigger value="bookmarked">Saved ({bookmarkedJobs.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {filteredJobs.length === 0 ? (
              <EmptyState icon={Briefcase} title="No job postings" description="Job and internship opportunities will appear here." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} isBookmarked={bookmarks.includes(job.id)} onToggleBookmark={() => toggleBookmark(job.id)} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="bookmarked" className="mt-4">
            {bookmarkedJobs.length === 0 ? (
              <EmptyState icon={Briefcase} title="No saved jobs" description="Bookmark jobs to save them for later." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {bookmarkedJobs.map((job) => (
                  <JobCard key={job.id} job={job} isBookmarked={true} onToggleBookmark={() => toggleBookmark(job.id)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
