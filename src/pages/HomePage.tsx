import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Award, Briefcase, Coffee, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickLinks = [
  { icon: Calendar, label: 'Events', path: '/events', color: 'text-category-chapter' },
  { icon: Users, label: 'Members', path: '/members', color: 'text-category-service' },
  { icon: Award, label: 'Points', path: '/points', color: 'text-secondary' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs', color: 'text-category-professionalism' },
  { icon: Coffee, label: 'Coffee Chats', path: '/coffee-chats', color: 'text-category-brotherhood' },
  { icon: Vote, label: 'EOP', path: '/eop', color: 'text-category-dei' },
];

export default function HomePage() {
  const { profile } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="gradient-hero rounded-2xl p-6 md:p-8 text-primary-foreground">
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {profile?.first_name || 'Brother'}!
          </h1>
          <p className="text-primary-foreground/80">
            Delta Sigma Pi - Nu Chapter Portal
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickLinks.map(({ icon: Icon, label, path, color }) => (
            <Link key={path} to={path}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <Icon className={`h-6 w-6 mb-2 ${color}`} />
                  <span className="text-sm font-medium">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Your Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">This semester</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Events Attended</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">This semester</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">Next 7 days</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
