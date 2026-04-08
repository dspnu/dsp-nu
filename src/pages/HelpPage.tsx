import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, CalendarCheck, Award, Coffee, Briefcase, Users,
  Clock, Shield, Vote, FolderOpen, Clapperboard, HelpCircle,
  BookOpen, MessageCircle, TrendingUp
} from 'lucide-react';
import { org } from '@/config/org';

interface FaqItem {
  q: string;
  a: string;
  tags: string[];
}

const sections: { title: string; icon: React.ReactNode; faqs: FaqItem[] }[] = [
  {
    title: 'Events & Attendance',
    icon: <CalendarCheck className="h-4 w-4" />,
    faqs: [
      {
        q: 'How do I check in to an event?',
        a: 'When an officer opens attendance for an event, you can check in by scanning the QR code displayed at the event or by navigating to the Events page and tapping "Check In" on the active event. Your check-in is timestamped automatically.',
        tags: ['events', 'attendance', 'qr'],
      },
      {
        q: 'What if I can\'t scan the QR code?',
        a: 'Ask an officer to mark you present using the manual attendance feature. They can search for your name and check you in directly from the event\'s attendance panel.',
        tags: ['events', 'attendance', 'qr'],
      },
      {
        q: 'How do I RSVP for an event?',
        a: 'Open the event from the Events page or the upcoming timeline on your Home screen. Tap the RSVP button and select your response (Going, Maybe, or Not Going). You can change your RSVP anytime before the event.',
        tags: ['events', 'rsvp'],
      },
      {
        q: 'Where can I see all upcoming events?',
        a: 'The Events page shows a calendar and list view of all chapter events. Your Home page also displays the next upcoming event and a timeline of the next five items.',
        tags: ['events', 'calendar'],
      },
    ],
  },
  {
    title: 'Points & Standing',
    icon: <Award className="h-4 w-4" />,
    faqs: [
      {
        q: 'How are points calculated?',
        a: `Points are awarded based on event attendance — each event has a point value tied to its category (${org.eventCategories.map(c => c.label).join(', ')}). Officers can also grant points manually for special contributions.`,
        tags: ['points', 'standing'],
      },
      {
        q: 'What do I need for good standing?',
        a: `You need at least ${org.standing.minPoints} total points across all categories and ${org.standing.minServiceHours} verified service hours. Your Standing card on the ${org.terms.chapter} page tracks your progress toward both requirements in real time.`,
        tags: ['points', 'standing', 'requirements'],
      },
      {
        q: 'What are the 7 point categories?',
        a: `The categories are: ${org.eventCategories.map(c => c.label).join(', ')}. Your points breakdown is visible on the ${org.terms.chapter} → Standing tab, showing a checkmark for each category where you've earned at least 1 point.`,
        tags: ['points', 'categories'],
      },
      {
        q: 'How do Attendance Earners work?',
        a: 'Attendance Earners are special point opportunities set up by the VP of Chapter Operations. When you complete one, an officer marks it as done and the associated points are added to your total automatically.',
        tags: ['points', 'attendance earners'],
      },
    ],
  },
  {
    title: 'Service Hours',
    icon: <Clock className="h-4 w-4" />,
    faqs: [
      {
        q: 'How do I log service hours?',
        a: 'Go to Chapter → Standing and click "Log Hours." Enter the date, number of hours, a description of the activity, and optionally attach a photo as proof. You can upload from your gallery or take a picture with your camera.',
        tags: ['service', 'hours'],
      },
      {
        q: 'Why are my hours showing as pending?',
        a: 'All service hours require officer verification before they count toward your standing. An officer (typically the VP of Community Service) will review your submission and photo proof, then approve it.',
        tags: ['service', 'hours', 'verification'],
      },
      {
        q: 'How many service hours do I need?',
        a: `You need ${org.standing.minServiceHours} verified service hours per semester. Once you hit ${org.standing.minServiceHours} hours, the service section on your Standing card will show "Completed."`,
        tags: ['service', 'hours', 'requirements'],
      },
    ],
  },
  {
    title: 'Coffee Chats',
    icon: <Coffee className="h-4 w-4" />,
    faqs: [
      {
        q: 'How do I log a coffee chat?',
        a: 'Go to the Coffee Chat Directory, find the approved member you met with, and submit a coffee chat. You\'ll need to provide the date and can add optional notes. The chat will appear as "emailed" until confirmed.',
        tags: ['coffee chats'],
      },
      {
        q: 'What are coffee chat milestones?',
        a: 'Officers set milestone targets (e.g., "Complete 5 coffee chats by March 15"). Your progress is tracked on the PDP page and Home dashboard. Meeting milestones contributes to your overall chapter engagement.',
        tags: ['coffee chats', 'milestones'],
      },
      {
        q: 'Who counts as an approved coffee chat partner?',
        a: `The approved members list is managed by officers and typically includes active ${org.terms.members.toLowerCase()} and sometimes alumni. You can browse the full directory on the Coffee Chat Directory page.`,
        tags: ['coffee chats', 'directory'],
      },
    ],
  },
  {
    title: 'Job Board',
    icon: <Briefcase className="h-4 w-4" />,
    faqs: [
      {
        q: 'How do I post a job or internship?',
        a: 'On the Chapter → Jobs tab, click the "Post Job" button. Fill in the company, title, type, description, and application link. Your post will be visible to all members once submitted.',
        tags: ['jobs', 'internships'],
      },
      {
        q: 'Can I save jobs for later?',
        a: 'Yes! Click the bookmark icon on any job card to save it. You can view all your saved jobs in the "Saved" tab on the Jobs page.',
        tags: ['jobs', 'bookmarks'],
      },
    ],
  },
  {
    title: 'Family Games',
    icon: <TrendingUp className="h-4 w-4" />,
    faqs: [
      {
        q: 'How are Family Games scores calculated?',
        a: `Each of the ${org.scoredCategories.length} main categories (${org.scoredCategories.map(c => { const found = org.eventCategories.find(e => e.key === c); return found ? found.label : c; }).join(', ')}) is scored as: (members with a point in that category ÷ total family members) × category weight. Weights are set by the VP of ${org.terms.chapter} Operations. Bonus points can also be added manually.`,
        tags: ['family', 'games', 'scoring'],
      },
      {
        q: 'How do I see my family\'s ranking?',
        a: 'The Family Games leaderboard is on the Chapter → Standing tab. Your family is highlighted, and your rank is shown on the status banner at the top.',
        tags: ['family', 'ranking'],
      },
    ],
  },
  {
    title: 'EOP (Election of Pledges)',
    icon: <Vote className="h-4 w-4" />,
    faqs: [
      {
        q: 'How does EOP voting work?',
        a: 'When the VP of Chapter Operations opens voting for a PNM, you\'ll see the candidate\'s profile and scores. Mark yourself as "Ready," then cast your vote (Yes, No, or Abstain). Voting is private and you can change your vote while the window is open.',
        tags: ['eop', 'voting'],
      },
      {
        q: 'What does "eligible voters" mean?',
        a: 'The eligible voter count starts from the base number (set from EOP attendance) minus any members marked as "out of the room" for that specific candidate. This determines the threshold for approval.',
        tags: ['eop', 'voting', 'eligible'],
      },
    ],
  },
  {
    title: 'Resources & Documents',
    icon: <FolderOpen className="h-4 w-4" />,
    faqs: [
      {
        q: 'Where can I find chapter documents?',
        a: 'The Chapter → Resources tab contains all shared documents organized by folder (Bylaws, Forms, Templates, etc.). Use the search bar or folder tabs to find what you need.',
        tags: ['resources', 'documents'],
      },
      {
        q: 'Can I upload resources?',
        a: 'Yes, any member can upload resources using the upload button on the Resources tab. Officers can manage and organize all uploaded files.',
        tags: ['resources', 'upload'],
      },
    ],
  },
  {
    title: 'Paddle Submissions',
    icon: <Clapperboard className="h-4 w-4" />,
    faqs: [
      {
        q: 'What is a paddle submission?',
        a: `Paddles are funny videos of your ${org.terms.members.toLowerCase()}! When the VP of Scholarship & Awards enables submissions, a "Paddle Time" card appears on your Home page. Submit the name of who's in the video and a link to the video.`,
        tags: ['paddle', 'videos'],
      },
    ],
  },
  {
    title: 'Account & Profile',
    icon: <Users className="h-4 w-4" />,
    faqs: [
      {
        q: 'How do I update my profile?',
        a: 'Go to the People page and find your profile, or navigate to Settings. You can update your major, graduation year, phone number, LinkedIn URL, and profile picture.',
        tags: ['profile', 'settings', 'account'],
      },
      {
        q: 'What are positions and committees?',
        a: 'Positions are executive roles (e.g., President, VP of Finance). Committees are working groups you belong to. Both are managed by admins and displayed on your profile.',
        tags: ['profile', 'positions'],
      },
      {
        q: 'How do I change my password?',
        a: 'Go to Settings and use the password reset option. You\'ll receive a confirmation email to complete the change.',
        tags: ['account', 'password', 'settings'],
      },
    ],
  },
  {
    title: 'Admin & Officers',
    icon: <Shield className="h-4 w-4" />,
    faqs: [
      {
        q: 'Who can access the Admin tab?',
        a: 'Only officers see the Admin tab on the Chapter page, and each officer only sees the dashboard for their specific role (e.g., VP of Community Service sees service hour verification, VP of Finance sees dues management).',
        tags: ['admin', 'officers', 'permissions'],
      },
      {
        q: 'How do officers grant points?',
        a: 'Officers can grant points from their admin dashboard by selecting a member, choosing a category, entering a point value and reason. Points appear immediately on the member\'s profile.',
        tags: ['admin', 'points', 'officers'],
      },
      {
        q: 'How are dues tracked?',
        a: 'The President and VP of Finance can record dues payments from their admin dashboards. Members can view their own dues status. Late fees and installment plans are configured per semester.',
        tags: ['admin', 'dues', 'finance'],
      },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');

  const allFaqs = sections.flatMap(s => s.faqs.map(f => ({ ...f, section: s.title })));

  const filteredSections = search.trim()
    ? [{
        title: 'Search Results',
        icon: <Search className="h-4 w-4" />,
        faqs: allFaqs.filter(f =>
          f.q.toLowerCase().includes(search.toLowerCase()) ||
          f.a.toLowerCase().includes(search.toLowerCase()) ||
          f.tags.some(t => t.includes(search.toLowerCase()))
        ),
      }]
    : sections;

  return (
    <AppLayout>
      <PageHeader
        title="Help Center"
        description="Everything you need to know about the app"
      />

      <div className="space-y-6">
        {/* Search */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Quick Links */}
        {!search && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {sections.slice(0, 5).map((section) => (
              <Card
                key={section.title}
                className="cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]"
                onClick={() => {
                  const el = document.getElementById(`section-${section.title}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    {section.icon}
                  </div>
                  <span className="text-xs font-medium truncate">{section.title}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* FAQ Sections */}
        {filteredSections.map((section) => (
          <Card key={section.title} id={`section-${section.title}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-primary">{section.icon}</span>
                {section.title}
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {section.faqs.length} {section.faqs.length === 1 ? 'question' : 'questions'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {section.faqs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No results found. Try a different search term.</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {section.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`${section.title}-${i}`}>
                      <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Footer */}
        <Card className="border-dashed">
          <CardContent className="p-6 text-center space-y-2">
            <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Still have questions?</p>
            <p className="text-xs text-muted-foreground">
              Reach out to your chapter officers or the VP of Chapter Operations for help with any app-related issues.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
