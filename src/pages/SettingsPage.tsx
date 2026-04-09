import { useState } from 'react';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/core/auth/AuthContext';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProfileEditDialog } from '@/core/members/components/ProfileEditDialog';
import { useMemberByUserId } from '@/core/members/hooks/useMembers';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/features/notifications/hooks/useNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LogOut, Bell, Palette, ExternalLink, ChevronRight, Download, Trash2, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

const NOTIFICATION_ITEMS = [
  { id: 'push', key: 'push_enabled', label: 'Push Notifications', desc: 'Browser push notifications' },
  { id: 'events', key: 'event_notifications', label: 'Events', desc: 'Event reminders and updates' },
  { id: 'service', key: 'service_hours_notifications', label: 'Service Hours', desc: 'Verification reminders' },
  { id: 'coffee', key: 'coffee_chat_notifications', label: 'Coffee Chats', desc: 'Confirmation reminders' },
  { id: 'jobs', key: 'job_board_notifications', label: 'Job Board', desc: 'New posting approvals' },
] as const;

export default function SettingsPage() {
  const { profile, roles, user, signOut } = useAuth();
  const { data: fullProfile } = useMemberByUserId(user?.id || '');
  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const { toast } = useToast();

  const [exporting, setExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handlePrefChange = (key: string, value: boolean) => {
    updatePrefs.mutate({ [key]: value });
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
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
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('attendance').select('*').eq('user_id', user.id),
        supabase.from('service_hours').select('*').eq('user_id', user.id),
        supabase.from('points_ledger').select('*').eq('user_id', user.id),
        supabase.from('coffee_chats').select('*').eq('user_id', user.id),
        supabase.from('dues_payments').select('*').eq('user_id', user.id),
        supabase.from('event_rsvps').select('*').eq('user_id', user.id),
        supabase.from('notification_preferences').select('*').eq('user_id', user.id),
        supabase.from('pdp_submissions').select('*').eq('user_id', user.id),
        supabase.from('job_bookmarks').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        account_email: user.email,
        profile: profileRes.data,
        attendance: attendanceRes.data || [],
        service_hours: serviceHoursRes.data || [],
        points: pointsRes.data || [],
        coffee_chats: coffeeChatsRes.data || [],
        dues_payments: duesPaymentsRes.data || [],
        event_rsvps: eventRsvpsRes.data || [],
        notification_preferences: notifPrefsRes.data,
        pdp_submissions: pdpSubmissionsRes.data || [],
        job_bookmarks: jobBookmarksRes.data || [],
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

      toast({ title: 'Data exported successfully' });
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
      const { error } = await supabase.rpc('delete_user_account');
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
    <AppLayout>
      <PageHeader title="Settings" description="Manage your account" />

      <div className="max-w-2xl space-y-8 pb-8">
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
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold truncate">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile?.status && <StatusBadge status={profile.status} />}
                  {roles.map(role => (
                    <span key={role} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {fullProfile && (
            <div className="border-t px-5 sm:px-6 py-3">
              <ProfileEditDialog
                profile={fullProfile}
                trigger={
                  <button className="w-full flex items-center justify-between text-sm font-medium text-primary hover:text-primary/80 transition-colors py-0.5">
                    Edit Profile
                    <ChevronRight className="h-4 w-4" />
                  </button>
                }
              />
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

        {/* ── Notifications ── */}
        <section>
          <SectionLabel icon={Bell} label="Notifications" />
          {prefs && (
            <div className="rounded-xl border bg-card divide-y">
              {NOTIFICATION_ITEMS.map((item) => (
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

        {/* ── Data & Privacy ── */}
        <section>
          <SectionLabel icon={Shield} label="Data & Privacy" />
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">Export Your Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download a copy of all your personal data as JSON
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
                  Permanently delete your account and all associated data
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

        {/* ── About & Legal ── */}
        <section>
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            <div className="px-4 py-4 sm:px-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                DSP is the chapter management platform for Delta Sigma Pi — helping members stay connected, track progress, and manage chapter operations.
              </p>
            </div>
            <a
              href="https://enterprises.jacobtartabini.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3.5 sm:px-5 text-sm hover:bg-accent/50 transition-colors"
            >
              Privacy Policy
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </a>
            <a
              href="https://enterprises.jacobtartabini.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3.5 sm:px-5 text-sm hover:bg-accent/50 transition-colors"
            >
              Terms of Service
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </a>
            <div className="px-4 py-3 sm:px-5">
              <p className="text-xs text-muted-foreground">&copy; 2026 Tartabini Enterprises LLC</p>
            </div>
          </div>
        </section>

        {/* ── Sign Out ── */}
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-11"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* ── Delete Account Confirmation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
