import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, GraduationCap, Linkedin, MapPin, Users, Heart, Award, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useMembers, useMemberPoints } from '@/hooks/useMembers';
import { useServiceHours } from '@/hooks/useServiceHours';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { allCategories, categoryLabels as orgCategoryLabels } from '@/config/org';

type Profile = Tables<'profiles'>;

const categories = allCategories;

const localCategoryLabels: Record<string, string> = {
  ...orgCategoryLabels,
  professionalism: 'Prof.',
};

interface MemberProfileDialogProps {
  member: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberProfileDialog({ member, open, onOpenChange }: MemberProfileDialogProps) {
  const { data: members } = useMembers();
  const { user, isAdminOrOfficer } = useAuth();
  
  const canViewDetails = isAdminOrOfficer || user?.id === member?.user_id;
  
  const { data: memberPoints } = useMemberPoints(member?.user_id ?? '');
  const { data: serviceHours } = useServiceHours(member?.user_id);
  
  const { data: dues } = useQuery({
    queryKey: ['member-dues', member?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dues_payments')
        .select('*')
        .eq('user_id', member!.user_id)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!member?.user_id && canViewDetails,
  });
  
  if (!member) return null;

  const extendedProfile = member as Profile & {
    pledge_class?: string;
    family?: string;
    big?: string;
    little?: string;
    hometown?: string;
  };

  const bigMember = members?.find(m => m.id === extendedProfile.big);
  const littleMember = members?.find(m => m.id === extendedProfile.little);
  
  // Calculate points by category (from points_ledger = attendance + manual grants)
  const pointsByCategory = memberPoints?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.points;
    return acc;
  }, {} as Record<string, number>) ?? {};

  // Service hours -> service points: 3 verified hours = 1 service point
  const verifiedServiceHours = serviceHours?.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0) ?? 0;
  const servicePointsFromHours = Math.floor(verifiedServiceHours / 3);
  
  // Total service points = from attendance/manual + from service hours
  const totalServicePoints = (pointsByCategory['service'] || 0) + servicePointsFromHours;
  
  // Override service in the display
  const displayPointsByCategory = { ...pointsByCategory, service: totalServicePoints };
  
  const totalPoints = categories.reduce((sum, cat) => {
    if (cat === 'service') return sum + totalServicePoints;
    return sum + (pointsByCategory[cat] || 0);
  }, 0);
  
  const totalServiceHours = serviceHours?.reduce((sum, h) => sum + Number(h.hours), 0) ?? 0;
  
  const currentSemester = new Date().getMonth() < 6 ? 'Spring' : 'Fall';
  const currentYear = new Date().getFullYear();
  const semesterKey = `${currentSemester} ${currentYear}`;
  const hasPaidDues = dues?.some(d => d.semester === semesterKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Member Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={member.avatar_url || ''} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {member.first_name?.[0]}{member.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {member.first_name} {member.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={member.status} />
              </div>
              {member.positions && member.positions.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {member.positions.map((pos) => (
                    <Badge key={pos} variant="secondary" className="text-xs">
                      {pos}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Contact</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${member.email}`} className="hover:underline">
                  {member.email}
                </a>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{member.phone}</span>
                </div>
              )}
              {extendedProfile.hometown && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{extendedProfile.hometown}</span>
                </div>
              )}
            </div>
          </div>

          {/* Academic Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Academic</h3>
            <div className="space-y-2 text-sm">
              {member.major && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>{member.major}</span>
                </div>
              )}
              {member.graduation_year && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>Class of {member.graduation_year}</span>
                </div>
              )}
            </div>
          </div>

          {/* Chapter Info */}
          {(extendedProfile.pledge_class || extendedProfile.family || bigMember || littleMember) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Chapter</h3>
              <div className="space-y-2 text-sm">
                {extendedProfile.pledge_class && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Pledge Class: {extendedProfile.pledge_class}</span>
                  </div>
                )}
                {extendedProfile.family && (
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>Family: {extendedProfile.family}</span>
                  </div>
                )}
                {bigMember && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Big:</span>
                    <span>{bigMember.first_name} {bigMember.last_name}</span>
                  </div>
                )}
                {littleMember && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Little:</span>
                    <span>{littleMember.first_name} {littleMember.last_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Committees */}
          {member.committees && member.committees.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Committees</h3>
              <div className="flex gap-1 flex-wrap">
                {member.committees.map((committee) => (
                  <Badge key={committee} variant="outline" className="text-xs">
                    {committee}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Points, Dues, Service Hours */}
          {canViewDetails && (
            <div className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Points</h3>
                    <Badge variant="secondary" className="ml-auto">{totalPoints} total</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map(cat => (
                      <div key={cat} className="text-center">
                        <div className="text-[10px] font-medium text-muted-foreground">{localCategoryLabels[cat]}</div>
                        <div className="text-sm font-bold mt-0.5">{displayPointsByCategory[cat] || 0}</div>
                      </div>
                    ))}
                  </div>
                  {servicePointsFromHours > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Service includes {servicePointsFromHours} pt{servicePointsFromHours !== 1 ? 's' : ''} from {verifiedServiceHours} verified hours (3h = 1pt)
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Dues</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasPaidDues ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm text-emerald-600">Paid</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive">Unpaid</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Service</span>
                    </div>
                    <div className="text-lg font-bold">{verifiedServiceHours}h</div>
                    <div className="text-xs text-muted-foreground">{totalServiceHours}h logged</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* LinkedIn */}
          {member.linkedin_url && (
            <Button asChild variant="outline" className="w-full gap-2">
              <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-4 w-4" />
                View LinkedIn Profile
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
