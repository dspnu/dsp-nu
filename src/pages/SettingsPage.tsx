import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/core/auth/AuthContext';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProfileEditDialog } from '@/core/members/components/ProfileEditDialog';
import { useMemberByUserId } from '@/core/members/hooks/useMembers';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/features/notifications/hooks/useNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LogOut, Bell, User, Palette } from 'lucide-react';

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
      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            {fullProfile && <ProfileEditDialog profile={fullProfile} />}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <div className="flex gap-2 mt-1">
                  {profile?.status && <StatusBadge status={profile.status} />}
                  {roles.map(role => (
                    <span key={role} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Appearance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefs && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive browser push notifications</p>
                  </div>
                  <Switch
                    id="push"
                    checked={prefs.push_enabled}
                    onCheckedChange={(val) => handlePrefChange('push_enabled', val)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="service">Service Hours</Label>
                    <p className="text-xs text-muted-foreground">When service hours need verification</p>
                  </div>
                  <Switch
                    id="service"
                    checked={prefs.service_hours_notifications}
                    onCheckedChange={(val) => handlePrefChange('service_hours_notifications', val)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="coffee">Coffee Chats</Label>
                    <p className="text-xs text-muted-foreground">When coffee chats need confirmation</p>
                  </div>
                  <Switch
                    id="coffee"
                    checked={prefs.coffee_chat_notifications}
                    onCheckedChange={(val) => handlePrefChange('coffee_chat_notifications', val)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="jobs">Job Board</Label>
                    <p className="text-xs text-muted-foreground">When new job postings need approval</p>
                  </div>
                  <Switch
                    id="jobs"
                    checked={prefs.job_board_notifications}
                    onCheckedChange={(val) => handlePrefChange('job_board_notifications', val)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="events">Events</Label>
                    <p className="text-xs text-muted-foreground">Event reminders and updates</p>
                  </div>
                  <Switch
                    id="events"
                    checked={prefs.event_notifications}
                    onCheckedChange={(val) => handlePrefChange('event_notifications', val)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="p-6">
            <Button
              variant="destructive"
              className="w-full"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
