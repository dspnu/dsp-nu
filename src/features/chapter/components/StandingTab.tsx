import { useState, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Trophy, Clock, Check, Target, TrendingUp, Plus, Camera, Image, X, User,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMembers, useMemberPoints } from '@/core/members/hooks/useMembers';
import { useAuth } from '@/core/auth/AuthContext';
import { useServiceHours, useLogServiceHours, useAllServiceHours } from '@/features/service-hours/hooks/useServiceHours';
import { org, allCategories } from '@/config/org';
import { useChapterSetting } from '@/hooks/useChapterSettings';

const POINTS_REQUIREMENT = org.standing.minPoints;
const SERVICE_HOURS_REQUIREMENT = org.standing.minServiceHours;
const SCORED_CATEGORIES = org.scoredCategories;

export function StandingTab() {
  const { user, profile } = useAuth();
  const { data: members } = useMembers();
  const { data: myPoints } = useMemberPoints(user?.id ?? '');
  const { data: myHours = [] } = useServiceHours(user?.id);
  const { data: pointCategoriesSetting } = useChapterSetting('custom_point_categories', {
    whenMissing: org.eventCategories.map((c) => c.key),
  });
  const { data: serviceHoursRequirementSetting } = useChapterSetting('service_hours_requirement', {
    whenMissing: SERVICE_HOURS_REQUIREMENT,
  });
  const categories = useMemo(() => {
    if (!Array.isArray(pointCategoriesSetting)) return allCategories;
    const custom = pointCategoriesSetting
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    return custom.length > 0 ? Array.from(new Set([...custom, 'new_member'])) : allCategories;
  }, [pointCategoriesSetting]);
  const serviceHoursRequirement = typeof serviceHoursRequirementSetting === 'number'
    ? serviceHoursRequirementSetting
    : Number(serviceHoursRequirementSetting) || SERVICE_HOURS_REQUIREMENT;

  const [logHoursOpen, setLogHoursOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [servicePhoto, setServicePhoto] = useState<File | null>(null);
  const [servicePhotoPreview, setServicePhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const logHoursMutation = useLogServiceHours();

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      toast.error('Could not access camera');
    }
  }, []);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setServicePhoto(file);
        setServicePhotoPreview(URL.createObjectURL(file));
      }
      closeCamera();
    }, 'image/jpeg', 0.85);
  }, [closeCamera]);

  const { data: allPoints } = useQuery({
    queryKey: ['all-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: familyWeights = [] } = useQuery({
    queryKey: ['family-game-weights'],
    queryFn: async () => {
      const { data, error } = await supabase.from('family_game_weights').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: familyBonusPoints = [] } = useQuery({
    queryKey: ['family-bonus-points'],
    queryFn: async () => {
      const { data, error } = await supabase.from('family_bonus_points').select('*');
      if (error) throw error;
      return data;
    },
  });

  const familyTotals = useMemo(() => {
    if (!members || !allPoints) return [];
    const activeMembers = members.filter(m => m.status === 'active' || m.status === 'new_member');
    const familyMap: Record<string, { family: string; score: number; memberCount: number }> = {};
    const familyMembers: Record<string, typeof activeMembers> = {};
    activeMembers.forEach(member => {
      const family = member.family || 'Unassigned';
      if (!familyMembers[family]) familyMembers[family] = [];
      familyMembers[family].push(member);
    });

    Object.entries(familyMembers).forEach(([family, fMembers]) => {
      const totalInFamily = fMembers.length;
      let score = 0;
      SCORED_CATEGORIES.forEach(cat => {
        const weight = familyWeights.find(w => w.category === cat);
        const weightValue = weight ? Number(weight.weight) : 1;
        const membersWithPoint = fMembers.filter(m =>
          allPoints.some(p => p.user_id === m.user_id && p.category === cat && p.points > 0)
        ).length;
        score += (membersWithPoint / totalInFamily) * weightValue;
      });
      const bonus = familyBonusPoints
        .filter(bp => bp.family_name === family)
        .reduce((sum, bp) => sum + bp.points, 0);
      score += bonus;
      familyMap[family] = { family, score, memberCount: totalInFamily };
    });

    return Object.values(familyMap).sort((a, b) => b.score - a.score);
  }, [members, allPoints, familyWeights, familyBonusPoints]);

  const myTotal = myPoints?.reduce((sum, p) => sum + p.points, 0) ?? 0;
  const myByCategory = myPoints?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.points;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const myTotalHours = myHours.reduce((sum, h) => sum + Number(h.hours), 0);
  const myVerifiedHours = myHours.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0);
  const myPendingHours = myTotalHours - myVerifiedHours;
  const myFamily = profile?.family || 'Unassigned';
  const myFamilyRank = familyTotals.findIndex(f => f.family === myFamily) + 1;

  const pointsProgress = Math.min((myTotal / POINTS_REQUIREMENT) * 100, 100);
  const hoursProgress = serviceHoursRequirement > 0
    ? Math.min((myVerifiedHours / serviceHoursRequirement) * 100, 100)
    : 100;
  const isGoodStanding = myTotal >= POINTS_REQUIREMENT && myVerifiedHours >= serviceHoursRequirement;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setServicePhoto(file);
      setServicePhotoPreview(URL.createObjectURL(file));
    }
  };

  const clearPhoto = () => {
    setServicePhoto(null);
    if (servicePhotoPreview) URL.revokeObjectURL(servicePhotoPreview);
    setServicePhotoPreview(null);
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !hours || !description || !serviceDate) return;

    let photo_url: string | undefined;

    if (servicePhoto) {
      setUploadingPhoto(true);
      const ext = servicePhoto.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('service-hours-photos')
        .upload(path, servicePhoto);
      setUploadingPhoto(false);
      if (uploadError) {
        toast.error('Failed to upload photo');
        return;
      }
      const { data: urlData } = supabase.storage
        .from('service-hours-photos')
        .getPublicUrl(path);
      photo_url = urlData.publicUrl;
    }

    logHoursMutation.mutate({
      user_id: user.id,
      hours: parseFloat(hours),
      description,
      service_date: serviceDate,
      photo_url,
    }, {
      onSuccess: () => {
        setLogHoursOpen(false);
        setHours('');
        setDescription('');
        setServiceDate('');
        clearPhoto();
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Compact status + stats row */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isGoodStanding ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
          {isGoodStanding ? <Check className="h-4 w-4 text-emerald-600" /> : <Target className="h-4 w-4 text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {isGoodStanding ? 'Good Standing' : 'In Progress'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isGoodStanding
              ? 'All requirements met'
              : `${POINTS_REQUIREMENT - myTotal > 0 ? `${POINTS_REQUIREMENT - myTotal} pts` : ''}${POINTS_REQUIREMENT - myTotal > 0 && serviceHoursRequirement - myVerifiedHours > 0 ? ' & ' : ''}${serviceHoursRequirement - myVerifiedHours > 0 ? `${(serviceHoursRequirement - myVerifiedHours).toFixed(1)} hrs remaining` : ''}`
            }
          </p>
        </div>
        {myFamilyRank > 0 && (
          <div className="text-right shrink-0 pl-2 border-l border-border/60">
            <p className="text-lg font-bold text-primary">#{myFamilyRank}</p>
            <p className="text-[10px] text-muted-foreground">Family</p>
          </div>
        )}
      </div>

      {/* Points + Service in one card */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Points</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{myTotal}</span>
                <span className="text-xs text-muted-foreground">/ {POINTS_REQUIREMENT}</span>
              </div>
            </div>
            <Progress value={pointsProgress} className="h-1.5 mb-3" />
            <div className="flex flex-wrap gap-1.5">
              {categories.filter(c => c !== 'new_member').map(cat => {
                const earned = (myByCategory[cat] || 0) >= 1;
                return (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 capitalize ${
                      earned
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'text-muted-foreground border-border/60'
                    }`}
                  >
                    {earned && <Check className="h-2.5 w-2.5 mr-0.5" />}
                    {cat === 'dei' ? 'DE&I' : cat}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/40" />

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Service Hours</span>
              </div>
              <div className="flex items-center gap-2">
                {myVerifiedHours >= serviceHoursRequirement ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/20 text-xs">
                    <Check className="h-2.5 w-2.5 mr-1" />Done
                  </Badge>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{myVerifiedHours.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">/ {serviceHoursRequirement}</span>
                  </div>
                )}
              </div>
            </div>
            <Progress value={hoursProgress} className="h-1.5 mb-3" />
            <div className="flex items-center justify-between">
              {myPendingHours > 0 && (
                <span className="text-xs text-amber-600">
                  {myPendingHours.toFixed(1)} hrs pending
                </span>
              )}
              <Dialog open={logHoursOpen} onOpenChange={setLogHoursOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="ml-auto h-7 text-xs gap-1.5">
                    <Plus className="h-3 w-3" />Log Hours
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Service Hours</DialogTitle></DialogHeader>
                  <form onSubmit={handleLogHours} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hours">Hours</Label>
                        <Input id="hours" type="number" step="0.5" min="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="2.5" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">What did you do?</Label>
                      <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the service activity..." required />
                    </div>
                    <div className="space-y-2">
                      <Label>Photo Proof (optional)</Label>
                      {servicePhotoPreview ? (
                        <div className="relative">
                          <img src={servicePhotoPreview} alt="Service proof" className="w-full h-40 object-cover rounded-md border" />
                          <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={clearPhoto}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : cameraOpen ? (
                        <div className="relative rounded-md overflow-hidden border">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-48 object-cover" />
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                            <Button type="button" size="sm" onClick={capturePhoto} className="gap-1">
                              <Camera className="h-4 w-4" />Capture
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={closeCamera}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => document.getElementById('service-photo-upload')?.click()}>
                            <Image className="h-4 w-4" />Upload
                          </Button>
                          <Button type="button" variant="outline" className="flex-1 gap-2" onClick={openCamera}>
                            <Camera className="h-4 w-4" />Camera
                          </Button>
                          <input id="service-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={logHoursMutation.isPending || uploadingPhoto}>
                      {uploadingPhoto ? 'Uploading photo...' : logHoursMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Points + Family Leaderboard side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent Activity</span>
          {myPoints && myPoints.length > 0 ? (
            <div className="space-y-1">
              {myPoints.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <CategoryBadge category={entry.category} />
                  <span className="text-sm flex-1 min-w-0 truncate">{entry.reason}</span>
                  <span className={`text-xs font-semibold tabular-nums ${entry.points > 0 ? 'text-primary' : 'text-destructive'}`}>
                    {entry.points > 0 ? '+' : ''}{entry.points}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No points earned yet</p>
          )}
        </div>

        <div className="space-y-2.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />Family Games
          </span>
          {familyTotals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No family data yet</p>
          ) : (
            <div className="space-y-1">
              {familyTotals.slice(0, 8).map(({ family, score, memberCount }, index) => {
                const isMyFamily = family === myFamily;
                return (
                  <div
                    key={family}
                    className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${isMyFamily ? 'bg-primary/5 ring-1 ring-primary/15' : 'hover:bg-muted/40'}`}
                  >
                    <span className={`w-5 text-center text-xs font-bold tabular-nums ${
                      index === 0 ? 'text-amber-500' :
                      index === 1 ? 'text-muted-foreground' :
                      index === 2 ? 'text-amber-700' :
                      'text-muted-foreground/60'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {family}
                        {isMyFamily && <span className="text-primary text-xs ml-1">•</span>}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      {memberCount}
                      <User className="h-3 w-3" />
                    </span>
                    <span className="text-sm font-semibold tabular-nums w-12 text-right">{score.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
