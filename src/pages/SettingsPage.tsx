import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/core/auth/AuthContext';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProfileEditDialog } from '@/core/members/components/ProfileEditDialog';
import { AvatarCropDialog } from '@/core/members/components/AvatarCropDialog';
import { useMemberByUserId, useUpdateMember, useMemberPoints } from '@/core/members/hooks/useMembers';
import { uploadCroppedAvatar } from '@/core/members/lib/uploadCroppedAvatar';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/features/notifications/hooks/useNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LogOut, Bell, Palette, ExternalLink, ChevronRight, Download, Trash2, Shield, ShieldCheck, Loader2, Upload, Award, Clock, DollarSign, Coffee, Crop, Smartphone, RefreshCw } from 'lucide-react';
import { legal } from '@/config/legal';
import { supabase } from '@/integrations/supabase/client';
import { useServiceHours } from '@/features/service-hours/hooks/useServiceHours';
import { useDuesPersonalSchedule } from '@/features/dues/hooks/useDuesPersonalSchedule';
import { useMyCoffeeChats } from '@/features/coffee-chats/hooks/useCoffeeChats';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useAddToHomeScreen } from '@/components/pwa/AddToHomeScreenPrompt';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getPeriodicSyncEnabled,
  registerPeriodicContentSync,
  registerDeferredBackgroundSync,
  setPeriodicSyncEnabled,
  subscribeToWebPush,
  supportsBackgroundSync,
  supportsPeriodicBackgroundSync,
  supportsWebPush,
  unsubscribeFromWebPush,
  unregisterPeriodicContentSync,
} from '@/lib/pwaAdvancedFeatures';
import { disableNativePush, enableNativePush, isNativeApp } from '@/lib/nativePush';
import { firmwareVersion } from '@/lib/appVersion';

const NOTIFICATION_ITEMS = [
  { id: 'push', key: 'push_enabled', label: 'Push notifications', desc: 'Browser push notifications (when available)' },
  { id: 'events', key: 'event_notifications', label: 'Events & opportunities', desc: 'New events and updates to events you are part of' },
  { id: 'remind24', key: 'event_reminder_24h', label: '24-hour reminders', desc: 'Heads-up the day before events you are attending' },
  { id: 'announce', key: 'announcement_notifications', label: 'Chapter announcements', desc: 'Messages broadcast by chapter leadership' },
  { id: 'service', key: 'service_hours_notifications', label: 'Service hours', desc: 'Verification reminders' },
  { id: 'coffee', key: 'coffee_chat_notifications', label: 'Coffee chats', desc: 'Scheduling and confirmations' },
  { id: 'jobs', key: 'job_board_notifications', label: 'Job board', desc: 'Posting and approval activity' },
] as const;

const PUSH_PREF = NOTIFICATION_ITEMS[0];
const OTHER_NOTIFICATION_ITEMS = NOTIFICATION_ITEMS.slice(1);

/**
 * Renders inside AppLayout so hooks like useAddToHomeScreen run under AddToHomeScreenProvider.
 */
function SettingsPageContent() {
  const isMobileLayout = useIsMobile();
  const { openAddToHomeScreen } = useAddToHomeScreen();
  const { profile, roles, user, signOut, refreshProfile } = useAuth();
  const { data: fullProfile } = useMemberByUserId(user?.id || '');
  const { data: memberPoints } = useMemberPoints(user?.id || '');
  const { data: serviceHours } = useServiceHours(user?.id);
  const { balanceInfo, semester: duesSemester } = useDuesPersonalSchedule();
  const { data: myCoffeeChats, isPending: coffeeChatsLoading } = useMyCoffeeChats();
  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const updateMember = useUpdateMember();
  const { toast } = useToast();
  const settingsPhotoInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [settingsCropFile, setSettingsCropFile] = useState<File | null>(null);
  const [settingsCropOpen, setSettingsCropOpen] = useState(false);
  const [settingsPhotoUploading, setSettingsPhotoUploading] = useState(false);
  const [periodicSyncUi, setPeriodicSyncUi] = useState(getPeriodicSyncEnabled);
  const [pushToggleBusy, setPushToggleBusy] = useState(false);

  useEffect(() => {
    setPeriodicSyncUi(getPeriodicSyncEnabled());
  }, []);

  const { data: dues } = useQuery({
    queryKey: ['member-dues', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dues_payments')
        .select('*')
        .eq('user_id', user!.id)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totalPoints = memberPoints?.reduce((sum, p) => sum + p.points, 0) ?? 0;
  const verifiedServiceHours =
    serviceHours?.filter((h) => h.verified).reduce((sum, h) => sum + Number(h.hours), 0) ?? 0;
  const totalServiceHours =
    serviceHours?.reduce((sum, h) => sum + Number(h.hours), 0) ?? 0;

  const hasPaidDuesLegacy = dues?.some((d) => d.semester === duesSemester);
  const completedCoffeeChats =
    myCoffeeChats?.filter((c) => c.status === 'completed').length ?? 0;

  const handlePrefChange = (key: string, value: boolean) => {
    updatePrefs.mutate({ [key]: value });
  };

  const handlePushToggle = async (val: boolean) => {
    if (isNativeApp()) {
      setPushToggleBusy(true);
      try {
        if (val) {
          await enableNativePush();
          updatePrefs.mutate({ push_enabled: true });
          toast({ title: 'Push notifications enabled' });
        } else {
          await disableNativePush();
          updatePrefs.mutate({ push_enabled: false });
          toast({ title: 'Push notifications disabled' });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Could not configure push';
        toast({ title: 'Push setup failed', description: message, variant: 'destructive' });
      } finally {
        setPushToggleBusy(false);
      }
      return;
    }

    if (val) {
      if (!supportsWebPush()) {
        toast({
          title: 'Not supported',
          description: 'Web Push is not available in this browser.',
          variant: 'destructive',
        });
        return;
      }
      const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
      if (!vapid) {
        toast({
          title: 'Push not configured',
          description:
            'Add VITE_VAPID_PUBLIC_KEY to your environment for Web Push. Your server uses the matching private key to send notifications.',
          variant: 'destructive',
        });
        return;
      }
      setPushToggleBusy(true);
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          toast({
            title: 'Notifications blocked',
            description: 'Allow notifications for this site in your browser settings to enable push.',
            variant: 'destructive',
          });
          return;
        }
        await subscribeToWebPush(vapid);
        updatePrefs.mutate({ push_enabled: true });
        toast({ title: 'Push notifications enabled' });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Could not subscribe to push';
        toast({ title: 'Push setup failed', description: message, variant: 'destructive' });
      } finally {
        setPushToggleBusy(false);
      }
    } else {
      setPushToggleBusy(true);
      try {
        await unsubscribeFromWebPush();
      } catch {
        /* ignore */
      } finally {
        setPushToggleBusy(false);
      }
      updatePrefs.mutate({ push_enabled: false });
    }
  };

  const handlePeriodicSyncToggle = async (val: boolean) => {
    if (!supportsPeriodicBackgroundSync()) {
      toast({
        title: 'Not supported',
        description: 'Periodic background sync is not available in this browser (common on iOS/Safari).',
        variant: 'destructive',
      });
      return;
    }
    if (val) {
      try {
        await registerPeriodicContentSync();
        setPeriodicSyncEnabled(true);
        setPeriodicSyncUi(true);
        toast({
          title: 'Periodic sync enabled',
          description: 'Widget and cached content can refresh in the background when the browser allows.',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        toast({ title: 'Could not enable periodic sync', description: message, variant: 'destructive' });
      }
    } else {
      await unregisterPeriodicContentSync();
      setPeriodicSyncEnabled(false);
      setPeriodicSyncUi(false);
    }
  };

  const handleDataUsageConsentChange = (value: boolean) => {
    updatePrefs.mutate({
      data_usage_consent: value,
      data_usage_consent_updated_at: new Date().toISOString(),
    });
  };

  const handleSettingsPhotoPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSettingsCropFile(file);
    setSettingsCropOpen(true);
    if (settingsPhotoInputRef.current) settingsPhotoInputRef.current.value = '';
  };

  const handleCropExistingPhoto = async () => {
    const url = profile?.avatar_url?.trim();
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not load image');
      const blob = await res.blob();
      const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
      const file = new File([blob], 'profile-photo', { type });
      setSettingsCropFile(file);
      setSettingsCropOpen(true);
    } catch (error: any) {
      toast({
        title: 'Could not load photo',
        description: error?.message || 'Try uploading a new image instead.',
        variant: 'destructive',
      });
    }
  };

  const handleSettingsCropOpenChange = (open: boolean) => {
    setSettingsCropOpen(open);
    if (!open) setSettingsCropFile(null);
  };

  const handleSettingsCropComplete = async (blob: Blob) => {
    if (!user || !fullProfile) return;
    setSettingsPhotoUploading(true);
    try {
      const publicUrl = await uploadCroppedAvatar(user.id, blob);
      await updateMember.mutateAsync({ id: fullProfile.id, avatar_url: publicUrl });
      await refreshProfile();
    } catch (error: any) {
      toast({
        title: 'Photo update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSettingsPhotoUploading(false);
      setSettingsCropFile(null);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const exportWarnings: string[] = [];

      const [
        profileRes,
        attendanceRes,
        serviceHoursRes,
        pointsRes,
        coffeeChatsRes,
        duesPaymentsRes,
        eventRsvpsRes,
        notifPrefsRes,
        pdpSubmissionsRes,
        jobBookmarksRes,
        notificationsRes,
        userRolesRes,
        attendanceEarnerCompletionsRes,
        paddleSubmissionsRes,
        pdpCommentsRes,
        eopReadyRes,
        eopVotesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('attendance').select('*').eq('user_id', user.id),
        supabase.from('service_hours').select('*').eq('user_id', user.id),
        supabase.from('points_ledger').select('*').eq('user_id', user.id),
        supabase.from('coffee_chats').select('*').or(`initiator_id.eq.${user.id},partner_id.eq.${user.id}`),
        supabase.from('dues_payments').select('*').eq('user_id', user.id),
        supabase.from('event_rsvps').select('*').eq('user_id', user.id),
        supabase.from('notification_preferences').select('*').eq('user_id', user.id),
        supabase.from('pdp_submissions').select('*').eq('user_id', user.id),
        supabase.from('job_bookmarks').select('*').eq('user_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id),
        supabase.from('user_roles').select('*').eq('user_id', user.id),
        supabase.from('attendance_earner_completions').select('*').eq('user_id', user.id),
        supabase.from('paddle_submissions').select('*').eq('user_id', user.id),
        supabase.from('pdp_comments').select('*').eq('user_id', user.id),
        supabase.from('eop_ready').select('*').eq('user_id', user.id),
        supabase.from('eop_votes').select('*').eq('voter_id', user.id),
      ]);

      const collect = (label: string, res: { error: { message: string } | null; data: unknown }) => {
        if (res.error) {
          exportWarnings.push(`${label}: ${res.error.message}`);
          return null;
        }
        return res.data;
      };

      const exportData = {
        exported_at: new Date().toISOString(),
        account_email: user.email,
        export_notes:
          'Personal data held in this application. If export_warnings is non-empty, some categories could not be retrieved (e.g. permissions).',
        export_warnings: exportWarnings,
        profile: collect('profiles', profileRes),
        attendance: collect('attendance', attendanceRes) ?? [],
        service_hours: collect('service_hours', serviceHoursRes) ?? [],
        points: collect('points_ledger', pointsRes) ?? [],
        coffee_chats: collect('coffee_chats', coffeeChatsRes) ?? [],
        dues_payments: collect('dues_payments', duesPaymentsRes) ?? [],
        event_rsvps: collect('event_rsvps', eventRsvpsRes) ?? [],
        notification_preferences: collect('notification_preferences', notifPrefsRes),
        pdp_submissions: collect('pdp_submissions', pdpSubmissionsRes) ?? [],
        job_bookmarks: collect('job_bookmarks', jobBookmarksRes) ?? [],
        notifications: collect('notifications', notificationsRes) ?? [],
        user_roles: collect('user_roles', userRolesRes) ?? [],
        attendance_earner_completions: collect('attendance_earner_completions', attendanceEarnerCompletionsRes) ?? [],
        paddle_submissions: collect('paddle_submissions', paddleSubmissionsRes) ?? [],
        pdp_comments: collect('pdp_comments', pdpCommentsRes) ?? [],
        eop_ready: collect('eop_ready', eopReadyRes) ?? [],
        eop_votes: collect('eop_votes', eopVotesRes) ?? [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dsp-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (exportWarnings.length > 0) {
        toast({
          title: 'Export downloaded',
          description: 'Some data categories could not be included. See export_warnings in the file.',
        });
      } else {
        toast({ title: 'Data exported successfully' });
      }
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user_account', {});
      if (error) throw error;

      setDeleteDialogOpen(false);
      await signOut();
    } catch (error: any) {
      toast({
        title: 'Account deletion failed',
        description: error.message,
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your account">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </PageHeader>

      <div className="w-full space-y-8">
        {/* ── Profile ── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 ring-2 ring-primary/10 ring-offset-2 ring-offset-card">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-xl sm:text-2xl bg-primary/10 text-primary font-display">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h2 className="text-lg font-semibold truncate">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile?.status && <StatusBadge status={profile.status} />}
                    {roles.map((role) => (
                      <span
                        key={role}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize font-medium"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Points</p>
                      <p className="text-sm font-semibold">{totalPoints}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Service</p>
                      <p className="text-sm font-semibold">
                        {verifiedServiceHours}h
                        {totalServiceHours > verifiedServiceHours && (
                          <span className="text-xs text-muted-foreground"> / {totalServiceHours}h</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dues</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {balanceInfo
                          ? balanceInfo.balance > 0
                            ? `$${balanceInfo.balance.toFixed(2)}`
                            : 'Paid'
                          : dues === undefined
                            ? '—'
                            : hasPaidDuesLegacy
                              ? 'Paid'
                              : 'Unpaid'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Coffee className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Coffee Chats</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {coffeeChatsLoading ? '—' : completedCoffeeChats}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {fullProfile && (
            <div className="border-t divide-y">
              <div className="px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Profile photo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Crop to a circle, then save to your profile
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <input
                    ref={settingsPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSettingsPhotoPick}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCropExistingPhoto}
                    disabled={settingsPhotoUploading || !profile?.avatar_url?.trim()}
                    className="gap-2"
                  >
                    <Crop className="h-4 w-4" />
                    Crop
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => settingsPhotoInputRef.current?.click()}
                    disabled={settingsPhotoUploading}
                    className="gap-2"
                  >
                    {settingsPhotoUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Change photo
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="px-5 sm:px-6 py-3">
                <ProfileEditDialog
                  profile={fullProfile}
                  trigger={
                    <button className="w-full flex items-center justify-between text-sm font-medium text-primary hover:text-primary/80 transition-colors py-0.5">
                      Edit profile details
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Appearance ── */}
        <section>
          <SectionLabel icon={Palette} label="Appearance" />
          <div className="rounded-xl border bg-card p-4">
            <ThemeToggle />
          </div>
        </section>

        {/* ── Install app (phone) ── */}
        {isMobileLayout && !isNativeApp() && (
          <section>
            <SectionLabel icon={Smartphone} label="Install app" />
            <div className="rounded-xl border bg-card overflow-hidden">
              <button
                type="button"
                onClick={openAddToHomeScreen}
                className="w-full flex items-center justify-between px-4 py-3.5 sm:px-5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-medium">Add to Home Screen</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Open these steps anytime to install the chapter portal like a native app
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </section>
        )}

        {/* ── Offline & background ── */}
        <section>
          <SectionLabel icon={RefreshCw} label="Offline & background" />
          <div className="rounded-xl border bg-card divide-y">
            <div className="px-4 py-3.5 sm:px-5">
              <p className="text-sm font-medium">Background sync</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                When you are offline, failed chapter API requests are queued and retried automatically when you have a
                stable connection. Coming back online also schedules a one-shot sync to refresh cached content.
              </p>
              {supportsBackgroundSync() && (
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void registerDeferredBackgroundSync().then(() => toast({ title: 'Sync scheduled' }))}
                  >
                    Sync when online
                  </Button>
                </div>
              )}
            </div>
            {!isNativeApp() && supportsPeriodicBackgroundSync() && (
              <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                <div className="min-w-0 pr-4">
                  <Label htmlFor="periodic-sync" className="text-sm font-medium cursor-pointer">
                    Periodic background refresh
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Prefetch widget data on a schedule so the app feels up to date when you open it (browser-controlled
                    timing; often Chromium desktop/Android installed PWA).
                  </p>
                </div>
                <Switch
                  id="periodic-sync"
                  checked={periodicSyncUi}
                  onCheckedChange={(v) => void handlePeriodicSyncToggle(v)}
                />
              </div>
            )}
          </div>
        </section>

        {/* ── App info ── */}
        <section>
          <SectionLabel icon={Smartphone} label="App info" />
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">Firmware</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current app firmware version
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {firmwareVersion.semver}
              </p>
            </div>
          </div>
        </section>

        {/* ── Notifications ── */}
        <section>
          <SectionLabel icon={Bell} label="Notifications" />
          {prefs && (
            <div className="rounded-xl border bg-card divide-y">
              <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                <div className="min-w-0 pr-4">
                  <Label htmlFor={PUSH_PREF.id} className="text-sm font-medium cursor-pointer">
                    {PUSH_PREF.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{PUSH_PREF.desc}</p>
                </div>
                <Switch
                  id={PUSH_PREF.id}
                  checked={prefs[PUSH_PREF.key as keyof typeof prefs] as boolean}
                  disabled={pushToggleBusy || updatePrefs.isPending}
                  onCheckedChange={(v) => void handlePushToggle(v)}
                />
              </div>
              {OTHER_NOTIFICATION_ITEMS.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 pr-4">
                    <Label htmlFor={item.id} className="text-sm font-medium cursor-pointer">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Switch
                    id={item.id}
                    checked={prefs[item.key as keyof typeof prefs] as boolean}
                    onCheckedChange={(val) => handlePrefChange(item.key, val)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Consent Preferences ── */}
        <section>
          <SectionLabel icon={ShieldCheck} label="Consent Preferences" />
          {prefs && (
            <div className="rounded-xl border bg-card divide-y overflow-hidden">
              <div className="px-4 py-3.5 sm:px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-4 flex-1">
                    <Label htmlFor="data-usage-consent" className="text-sm font-medium cursor-pointer">
                      Data usage consent
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allow us to use your activity and usage data to improve features, personalize your experience,
                      and inform product improvements. You can turn this on or off anytime.{' '}
                      <a
                        href={legal.privacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium"
                      >
                        Privacy Policy
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-80" />
                      </a>
                    </p>
                    <p className="text-xs text-muted-foreground/90 mt-2">
                      {prefs.data_usage_consent_updated_at
                        ? `Last updated ${new Date(prefs.data_usage_consent_updated_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}`
                        : 'Last updated will appear here after you change this setting.'}
                    </p>
                  </div>
                  <Switch
                    id="data-usage-consent"
                    checked={prefs.data_usage_consent}
                    onCheckedChange={handleDataUsageConsentChange}
                    disabled={updatePrefs.isPending}
                    className="shrink-0"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Data & Privacy ── */}
        <section>
          <SectionLabel icon={Shield} label="Data & Privacy" />
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">Export Your Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download a machine-readable copy of your personal data (JSON), including profile, activity, and preferences where available
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={exporting}
                className="shrink-0"
              >
                {exporting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Export</>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently remove your login and delete associated records held in this app. Export your data first if you need a copy.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </section>

        <footer className="mt-14 pt-8 border-t border-border/60">
          <p className="text-xs text-muted-foreground text-center sm:text-left leading-relaxed max-w-2xl mx-auto sm:mx-0 mb-5">
            The DSP App is a club management software developed and operated by Tartabini Enterprises LLC. It is provided to support communication, organization, and member engagement within participating student organizations. The DSP App is not owned, controlled, or governed by any affiliated organization.
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-sm text-muted-foreground"
          >
            <a
              href={legal.eulaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              EULA
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <a
              href={legal.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              Privacy Policy
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <a
              href={legal.termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              Terms of Service
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <a
              href={legal.cookiesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              Cookie Policy
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          </nav>
        </footer>
      </div>

      {/* ── Delete Account Confirmation ── */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmText('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This action is <strong className="text-destructive">permanent and irreversible</strong>.
                  All of your data will be deleted, including your profile, attendance records, points,
                  service hours, and any other associated data.
                </p>
                <p>
                  We recommend exporting your data before proceeding.
                </p>
                <div className="pt-1">
                  <label className="text-xs font-medium text-foreground" htmlFor="delete-confirm">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm
                  </label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="mt-1.5 font-mono"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                'Permanently Delete Account'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AvatarCropDialog
        file={settingsCropFile}
        open={settingsCropOpen}
        onOpenChange={handleSettingsCropOpenChange}
        onCropComplete={handleSettingsCropComplete}
      />
    </>
  );
}

export default function SettingsPage() {
  return (
    <AppLayout>
      <SettingsPageContent />
    </AppLayout>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</h3>
    </div>
  );
}
