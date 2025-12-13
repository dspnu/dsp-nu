import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/ui/status-badge';

export default function SettingsPage() {
  const { profile, roles } = useAuth();

  return (
    <AppLayout>
      <PageHeader title="Settings" description="Manage your account" />
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-display font-bold text-xl">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </span>
            </div>
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
    </AppLayout>
  );
}
