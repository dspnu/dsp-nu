import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Search, Download, Building2, MapPin, Linkedin } from 'lucide-react';
import { AlumniForm } from '@/components/alumni/AlumniForm';
import { AlumniCard } from '@/components/alumni/AlumniCard';
import { useAlumni } from '@/hooks/useAlumni';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/lib/csv';

export default function AlumniPage() {
  const { isAdminOrOfficer } = useAuth();
  const { data: alumni, isLoading } = useAlumni();
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');

  // Get unique industries
  const industries = useMemo(() => {
    if (!alumni) return [];
    const uniqueIndustries = [...new Set(alumni.map(a => a.industry).filter(Boolean))];
    return uniqueIndustries.sort();
  }, [alumni]);

  // Filter alumni
  const filteredAlumni = useMemo(() => {
    if (!alumni) return [];
    return alumni.filter(alum => {
      const matchesSearch = search === '' || 
        `${alum.first_name} ${alum.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        alum.company?.toLowerCase().includes(search.toLowerCase()) ||
        alum.job_title?.toLowerCase().includes(search.toLowerCase());
      
      const matchesIndustry = industryFilter === 'all' || alum.industry === industryFilter;
      
      return matchesSearch && matchesIndustry;
    });
  }, [alumni, search, industryFilter]);

  // Stats
  const totalAlumni = alumni?.length || 0;
  const uniqueCompanies = new Set(alumni?.map(a => a.company).filter(Boolean)).size;

  const handleExport = () => {
    if (!alumni) return;
    exportToCSV(alumni, 'alumni-directory');
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Alumni Network" 
        description="Connect with chapter alumni"
      >
        {isAdminOrOfficer && <AlumniForm />}
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAlumni}</p>
              <p className="text-sm text-muted-foreground">Alumni</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueCompanies}</p>
              <p className="text-sm text-muted-foreground">Companies</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry!}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdminOrOfficer && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      {/* Alumni Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filteredAlumni.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAlumni.map((alum) => (
            <AlumniCard key={alum.id} alumni={alum} />
          ))}
        </div>
      ) : alumni && alumni.length > 0 ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No alumni yet"
          description={isAdminOrOfficer 
            ? "Add alumni to build your network directory."
            : "Alumni network will appear here when added by officers."
          }
        />
      )}
    </AppLayout>
  );
}
