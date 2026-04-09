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
import { LogOut, Bell, Palette, ExternalLink, ChevronRight } from 'lucide-react';

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

  const handlePrefChange = (key: string, value: boolean) => {
    updatePrefs.mutate({ [key]: value });
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
