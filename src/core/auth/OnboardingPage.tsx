import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Camera, ChevronRight, ChevronLeft,
  Home, Users, Calendar, Building, GraduationCap, Award, Clock, Coffee, Briefcase, CheckCircle, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { org } from '@/config/org';
import { AccountLegalNotice } from '@/components/legal/AccountLegalNotice';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';
import { motion, AnimatePresence } from 'framer-motion';

const TOTAL_STEPS = 5;
const currentYear = new Date().getFullYear();
const gradYears = Array.from({ length: 8 }, (_, i) => currentYear + i);

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.97,
  }),
};

const pageTransition = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 32,
  mass: 0.8,
};

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            'rounded-full transition-colors',
            i === current
              ? 'bg-primary'
              : i < current
                ? 'bg-primary/40'
                : 'bg-muted-foreground/20'
          )}
          animate={{
            width: i === current ? 24 : 8,
            height: 8,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [major, setMajor] = useState(profile?.major || '');
  const [gradYear, setGradYear] = useState(profile?.graduation_year?.toString() || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || '');
  const [hometown, setHometown] = useState((profile as any)?.hometown || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();
    const trimmedMajor = major.trim();
    const trimmedLinkedin = linkedinUrl.trim();
    const trimmedHometown = hometown.trim();

    if (!trimmedFirst || !trimmedLast || !trimmedPhone || !trimmedMajor || !gradYear) {
      toast.error('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (!uploadErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          finalAvatarUrl = data.publicUrl;
        }
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: trimmedFirst,
          last_name: trimmedLast,
          phone: trimmedPhone,
          major: trimmedMajor,
          graduation_year: parseInt(gradYear, 10),
          linkedin_url: trimmedLinkedin || null,
          hometown: trimmedHometown || null,
          avatar_url: finalAvatarUrl,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      goTo(2);
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    navigate('/', { replace: true });
    toast.success(`Welcome to ${org.name}! 🎉`);
  };

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">{org.greekLetters}</span>
            </div>
            <span className="font-display font-semibold text-foreground text-sm">Welcome</span>
          </div>
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-hidden">
        <div className="w-full max-w-2xl relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
            >
              {/* Step 0: Welcome */}
              {step === 0 && (
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                    className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-purple"
                  >
                    <span className="text-primary-foreground font-display font-bold text-4xl">{org.greekLetters}</span>
                  </motion.div>
                  <div>
                    <h1 className="font-display text-3xl font-bold text-foreground">Welcome, {firstName || org.terms.member}!</h1>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                      Let's get your profile set up and show you around the chapter portal. This will only take a couple minutes.
                    </p>
                  </div>
                  <Button size="lg" className="gap-2" onClick={() => goTo(1)}>
                    Let's Get Started <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Step 1: Profile Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-2xl font-bold text-foreground">Complete Your Profile</h2>
                    <p className="text-muted-foreground mt-1">Help your {org.terms.members.toLowerCase()} get to know you.</p>
                  </div>
                  <Card>
                    <CardContent className="pt-6 space-y-6">
                      <div className="flex flex-col items-center gap-3">
                        <Avatar className="h-24 w-24 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all" onClick={() => fileInputRef.current?.click()}>
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials || '?'}</AvatarFallback>
                        </Avatar>
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
                          <Camera className="h-3 w-3" />{avatarUrl ? 'Change Photo' : 'Add Photo'}
                        </Button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            Major <span className="text-destructive">*</span>
                          </Label>
                          <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Finance" required />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Graduation Year <span className="text-destructive">*</span>
                          </Label>
                          <Select value={gradYear} onValueChange={setGradYear}>
                            <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                            <SelectContent>
                              {gradYears.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            Phone Number <span className="text-destructive">*</span>
                          </Label>
                          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Hometown</Label>
                          <Input value={hometown} onChange={(e) => setHometown(e.target.value)} placeholder="Columbus, OH" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>LinkedIn URL</Label>
                        <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => goTo(0)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Back
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving || !firstName.trim() || !lastName.trim() || !phone.trim() || !major.trim() || !gradYear}
                      className="gap-2"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {saving ? 'Saving...' : 'Save & Continue'}
                      {!saving && <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Tour - Navigation */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h2 className="font-display text-2xl font-bold text-foreground">Your Chapter Portal</h2>
                    <p className="text-muted-foreground mt-1">Here's a quick overview of what you can do.</p>
                  </div>
                  <div className="grid gap-3">
                    {[
                      { icon: Home, title: 'Home', desc: 'Your dashboard with upcoming events, standing progress, quick actions, and alerts at a glance.' },
                      { icon: Users, title: 'People', desc: 'Browse the full member directory — see profiles, contact info, positions, and family trees.' },
                      { icon: Calendar, title: 'Events', desc: 'View all chapter events in calendar or list view. RSVP and track your attendance here.' },
                      { icon: Building, title: 'Chapter', desc: 'Your one-stop hub for points, service hours, dues, jobs board, coffee chats, and resources.' },
                    ].map((item, i) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="flex items-start gap-4 py-4">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                              <item.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{item.title}</h3>
                              <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => goTo(1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Back
                    </Button>
                    <Button onClick={() => goTo(3)} className="gap-2">
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Tour - Key Features */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h2 className="font-display text-2xl font-bold text-foreground">Key Features</h2>
                    <p className="text-muted-foreground mt-1">Everything you need to stay engaged and on track.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { icon: Award, title: 'Points System', desc: 'Earn points by attending events across 8 categories. Track progress toward your semester goal.' },
                      { icon: Clock, title: 'Service Hours', desc: 'Log community service hours with photo proof. 3 verified hours = 1 bonus service point.' },
                      { icon: Coffee, title: 'Coffee Chats', desc: `Schedule and track coffee chats with ${org.terms.members.toLowerCase()}. Hit milestones set by leadership.` },
                      { icon: Briefcase, title: 'Job Board', desc: `Browse and post internships, full-time roles, and other opportunities shared by ${org.terms.members.toLowerCase()}.` },
                      { icon: GraduationCap, title: 'PDP', desc: 'New members: complete assignments, access resources, and track your pledge development progress.' },
                      { icon: CheckCircle, title: 'Good Standing', desc: 'Meet your points and service hour requirements to stay in good standing each semester.' },
                    ].map((item, i) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="py-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <item.icon className="h-4 w-4 text-primary" />
                              <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => goTo(2)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Back
                    </Button>
                    <Button onClick={() => goTo(4)} className="gap-2">
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: All Done */}
              {step === 4 && (
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
                  >
                    <CheckCircle className="h-10 w-10 text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground">You're All Set!</h2>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                      Your profile is complete and you're ready to dive in. Check out upcoming events, connect with {org.terms.members.toLowerCase()}, and start earning points.
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <Button size="lg" className="gap-2" onClick={handleFinish}>
                      Go to Dashboard <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => goTo(3)}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Go Back
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 px-4 py-5 border-t border-border/50 bg-background/90">
        <div className="max-w-2xl mx-auto w-full space-y-3">
          <AccountLegalNotice />
          <AppCopyrightFooter />
        </div>
      </div>
    </div>
  );
}
