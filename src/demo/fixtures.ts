import { addDays, addHours, subDays, setHours, setMinutes } from 'date-fns';
import type { User, Session } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';
import { DEMO_USER_ID, DEMO_MEMBER_IDS as MID } from './ids';

type Profile = Tables<'profiles'>;
type Event = Tables<'events'>;

const now = new Date();
const ts = (d: Date) => d.toISOString();
const daysFromNow = (days: number, hour = 18, minute = 0) =>
  ts(setMinutes(setHours(addDays(now, days), hour), minute));
const daysAgo = (days: number) => ts(subDays(now, days));

function avatar(seed: number) {
  return `https://i.pravatar.cc/150?img=${seed}`;
}

function profile(
  id: string,
  userId: string,
  first: string,
  last: string,
  opts: Partial<Profile> & Pick<Profile, 'email' | 'status' | 'major' | 'graduation_year' | 'family'>,
): Profile {
  const t = ts(now);
  return {
    id,
    user_id: userId,
    first_name: first,
    last_name: last,
    phone: opts.phone ?? '(555) 010-0000',
    graduation_year: opts.graduation_year,
    major: opts.major,
    status: opts.status,
    positions: opts.positions ?? [],
    committees: opts.committees ?? [],
    avatar_url: opts.avatar_url ?? avatar(10),
    linkedin_url: opts.linkedin_url ?? null,
    family: opts.family,
    big: opts.big ?? null,
    little: opts.little ?? null,
    signup_unlocked: true,
    email: opts.email,
    chair: opts.chair ?? null,
    hometown: opts.hometown ?? 'Boston, MA',
    pledge_class: opts.pledge_class ?? 'Fall 2024',
    created_at: t,
    updated_at: t,
  };
}

export const demoMembers: Profile[] = [
  profile(MID.alex, DEMO_USER_ID, 'Alex', 'Morgan', {
    email: 'alex.morgan@chapteros.demo',
    status: 'active',
    major: 'Finance',
    graduation_year: 2027,
    family: 'Alpha',
    big: MID.jordan,
    little: MID.morgan,
    positions: ['President', 'VP of New Member Education'],
    avatar_url: avatar(11),
  }),
  profile(MID.jordan, MID.jordan, 'Jordan', 'Lee', {
    email: 'jordan.lee@chapteros.demo',
    status: 'active',
    major: 'Economics',
    graduation_year: 2026,
    family: 'Alpha',
    positions: ['Senior Vice President'],
    avatar_url: avatar(12),
  }),
  profile(MID.casey, MID.casey, 'Casey', 'Brooks', {
    email: 'casey.brooks@chapteros.demo',
    status: 'active',
    major: 'Accounting',
    graduation_year: 2026,
    family: 'Beta',
    positions: ['VP of Finance'],
    avatar_url: avatar(13),
  }),
  profile(MID.riley, MID.riley, 'Riley', 'Chen', {
    email: 'riley.chen@chapteros.demo',
    status: 'active',
    major: 'Information Systems',
    graduation_year: 2027,
    family: 'Beta',
    positions: ['VP of Professional Activities'],
    avatar_url: avatar(14),
  }),
  profile(MID.morgan, MID.morgan, 'Morgan', 'Davis', {
    email: 'morgan.davis@chapteros.demo',
    status: 'new_member',
    major: 'Marketing',
    graduation_year: 2028,
    family: 'Gamma',
    big: MID.alex,
    avatar_url: avatar(15),
  }),
  profile(MID.taylor, MID.taylor, 'Taylor', 'Wright', {
    email: 'taylor.wright@chapteros.demo',
    status: 'active',
    major: 'Management',
    graduation_year: 2027,
    family: 'Gamma',
    avatar_url: avatar(16),
  }),
  profile(MID.quinn, MID.quinn, 'Quinn', 'Parker', {
    email: 'quinn.parker@chapteros.demo',
    status: 'active',
    major: 'Entrepreneurship',
    graduation_year: 2026,
    family: 'Delta',
    avatar_url: avatar(17),
  }),
  profile(MID.avery, MID.avery, 'Avery', 'Kim', {
    email: 'avery.kim@chapteros.demo',
    status: 'active',
    major: 'Supply Chain',
    graduation_year: 2027,
    family: 'Delta',
    avatar_url: avatar(18),
  }),
  profile(MID.blake, MID.blake, 'Blake', 'Johnson', {
    email: 'blake.johnson@chapteros.demo',
    status: 'active',
    major: 'Real Estate',
    graduation_year: 2026,
    family: 'Alpha',
    avatar_url: avatar(19),
  }),
  profile(MID.drew, MID.drew, 'Drew', 'Martinez', {
    email: 'drew.martinez@chapteros.demo',
    status: 'active',
    major: 'International Business',
    graduation_year: 2027,
    family: 'Beta',
    avatar_url: avatar(20),
  }),
  profile(MID.sam, MID.sam, 'Sam', 'Wilson', {
    email: 'sam.wilson@chapteros.demo',
    status: 'active',
    major: 'Business Analytics',
    graduation_year: 2026,
    family: 'Gamma',
    avatar_url: avatar(21),
  }),
  profile(MID.jamie, MID.jamie, 'Jamie', 'Foster', {
    email: 'jamie.foster@chapteros.demo',
    status: 'new_member',
    major: 'Hospitality',
    graduation_year: 2028,
    family: 'Delta',
    avatar_url: avatar(22),
  }),
  profile(MID.chris, MID.chris, 'Chris', 'Allen', {
    email: 'chris.allen@chapteros.demo',
    status: 'active',
    major: 'Political Science',
    graduation_year: 2026,
    family: 'Alpha',
    positions: ['Chancellor'],
    avatar_url: avatar(23),
  }),
  profile(MID.pat, MID.pat, 'Pat', 'Nguyen', {
    email: 'pat.nguyen@chapteros.demo',
    status: 'active',
    major: 'Communications',
    graduation_year: 2027,
    family: 'Beta',
    positions: ['Historian'],
    avatar_url: avatar(24),
  }),
  profile(MID.robin, MID.robin, 'Robin', 'Hayes', {
    email: 'robin.hayes@chapteros.demo',
    status: 'active',
    major: 'Psychology',
    graduation_year: 2026,
    family: 'Gamma',
    positions: ['VP of Brotherhood'],
    avatar_url: avatar(25),
  }),
];

export const demoProfile = demoMembers[0]!;

export const demoUser = {
  id: DEMO_USER_ID,
  email: demoProfile.email,
  app_metadata: {},
  user_metadata: { first_name: 'Alex', last_name: 'Morgan' },
  aud: 'authenticated',
  created_at: daysAgo(400),
} as User;

export const demoSession = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: demoUser,
} as Session;

export const demoRoles = ['officer', 'exec'] as const;

function event(
  id: string,
  title: string,
  start: string,
  category: Event['category'],
  opts: Partial<Event> = {},
): Event {
  const t = ts(now);
  return {
    id,
    title,
    start_time: start,
    end_time: opts.end_time ?? addHours(new Date(start), 2).toISOString(),
    category,
    description: opts.description ?? null,
    location: opts.location ?? 'Chapter House',
    points_value: opts.points_value ?? 1,
    organizer_id: DEMO_USER_ID,
    is_required: opts.is_required ?? false,
    attendance_open: opts.attendance_open ?? false,
    payment_required: opts.payment_required ?? false,
    qr_code: opts.qr_code ?? null,
    created_at: t,
    updated_at: t,
  };
}

export const demoEvents: Event[] = [
  event('e001', 'Weekly Chapter Meeting', daysFromNow(1, 19), 'chapter', {
    is_required: true,
    location: 'Business Building, Room 204',
    description: 'Required chapter meeting — dress code: business casual.',
  }),
  event('e002', 'Resume Workshop', daysFromNow(3, 17), 'professionalism', {
    location: 'Career Center',
    points_value: 1,
  }),
  event('e003', 'Brotherhood Bowling Night', daysFromNow(5, 20), 'brotherhood', {
    location: 'Campus Lanes',
  }),
  event('e004', 'Community Food Drive', daysFromNow(7, 9), 'service', {
    location: 'City Food Bank',
    points_value: 2,
  }),
  event('e005', 'Annual Fundraising Gala', daysFromNow(10, 18), 'fundraising', {
    location: 'Grand Ballroom',
    payment_required: true,
  }),
  event('e006', 'Rush Info Session', daysFromNow(14, 18), 'rush', {
    location: 'Student Union',
  }),
  event('e007', 'DE&I Panel Discussion', daysFromNow(18, 17), 'dei', {
    location: 'Auditorium B',
  }),
  event('e008', 'Exec Board Planning', daysFromNow(2, 12), 'exec', {
    location: 'Chapter Office',
  }),
  event('e009', 'Last Week Social', daysAgo(3), 'brotherhood', {
    location: 'Campus Green',
  }),
];

export const demoPointsLedger = [
  { id: 'p1', user_id: DEMO_USER_ID, points: 2, category: 'chapter', reason: 'Chapter meeting', created_at: daysAgo(7), created_by: MID.jordan },
  { id: 'p2', user_id: DEMO_USER_ID, points: 1, category: 'professionalism', reason: 'Workshop', created_at: daysAgo(14), created_by: MID.riley },
  { id: 'p3', user_id: DEMO_USER_ID, points: 1, category: 'brotherhood', reason: 'Social event', created_at: daysAgo(10), created_by: MID.robin },
  { id: 'p4', user_id: DEMO_USER_ID, points: 2, category: 'service', reason: 'Volunteer day', created_at: daysAgo(21), created_by: MID.quinn },
  { id: 'p5', user_id: DEMO_USER_ID, points: 1, category: 'fundraising', reason: 'Fundraiser', created_at: daysAgo(28), created_by: MID.casey },
  ...demoMembers.slice(1, 8).flatMap((m, i) => [
    { id: `pm${i}a`, user_id: m.user_id, points: 1, category: 'chapter' as const, reason: 'Meeting', created_at: daysAgo(5), created_by: MID.jordan },
    { id: `pm${i}b`, user_id: m.user_id, points: 1, category: 'brotherhood' as const, reason: 'Social', created_at: daysAgo(12), created_by: MID.robin },
  ]),
];

export const demoServiceHours = [
  { id: 'sh1', user_id: DEMO_USER_ID, hours: 1.5, description: 'Food bank sorting', service_date: daysAgo(14), verified: true, verified_by: MID.casey, photo_url: null, created_at: daysAgo(14), updated_at: daysAgo(13) },
  { id: 'sh2', user_id: DEMO_USER_ID, hours: 1.0, description: 'Park cleanup', service_date: daysAgo(30), verified: true, verified_by: MID.quinn, photo_url: null, created_at: daysAgo(30), updated_at: daysAgo(29) },
  { id: 'sh3', user_id: DEMO_USER_ID, hours: 0.5, description: 'Tutoring session', service_date: daysAgo(2), verified: false, verified_by: null, photo_url: null, created_at: daysAgo(2), updated_at: daysAgo(2) },
];

export const demoCoffeeChats = [
  { id: 'cc1', initiator_id: DEMO_USER_ID, partner_id: MID.taylor, chat_date: daysFromNow(2), status: 'emailed' as const, confirmed_by: null, notes: 'Discuss professional goals', proof_url: null, created_at: daysAgo(1), updated_at: daysAgo(1) },
  { id: 'cc2', initiator_id: MID.quinn, partner_id: DEMO_USER_ID, chat_date: daysFromNow(4), status: 'emailed' as const, confirmed_by: null, notes: null, proof_url: null, created_at: daysAgo(2), updated_at: daysAgo(2) },
  { id: 'cc3', initiator_id: DEMO_USER_ID, partner_id: MID.avery, chat_date: daysAgo(5), status: 'completed' as const, confirmed_by: MID.avery, notes: 'Great conversation!', proof_url: null, created_at: daysAgo(10), updated_at: daysAgo(5) },
  { id: 'cc4', initiator_id: MID.blake, partner_id: DEMO_USER_ID, chat_date: daysFromNow(6), status: 'scheduled' as const, confirmed_by: DEMO_USER_ID, notes: null, proof_url: null, created_at: daysAgo(3), updated_at: daysAgo(1) },
];

export const demoEopCandidates = [
  { id: 'eop1', first_name: 'Ethan', last_name: 'Rivera', email: 'ethan.r@demo.edu', phone: null, picture_url: avatar(30), voting_open: true, interview_score: 92, video_score: 88, notes: 'Strong leadership potential', r1_pu: 'Yes', r2_pu: 'Yes', tu_td: 4, eligible_voters: 42, absent_members: [], attachments: [], interview_graded_by: MID.riley, video_graded_by: MID.jordan, created_at: daysAgo(14), updated_at: daysAgo(1) },
  { id: 'eop2', first_name: 'Sophia', last_name: 'Nguyen', email: 'sophia.n@demo.edu', phone: null, picture_url: avatar(31), voting_open: true, interview_score: 89, video_score: 91, notes: null, r1_pu: 'Yes', r2_pu: 'Yes', tu_td: 3, eligible_voters: 42, absent_members: [], attachments: [], interview_graded_by: MID.riley, video_graded_by: MID.jordan, created_at: daysAgo(14), updated_at: daysAgo(1) },
  { id: 'eop3', first_name: 'Marcus', last_name: 'Thompson', email: 'marcus.t@demo.edu', phone: null, picture_url: avatar(32), voting_open: true, interview_score: 85, video_score: 87, notes: 'Excellent campus involvement', r1_pu: 'Yes', r2_pu: 'Maybe', tu_td: 2, eligible_voters: 42, absent_members: [], attachments: [], interview_graded_by: MID.riley, video_graded_by: MID.jordan, created_at: daysAgo(14), updated_at: daysAgo(1) },
];

export const demoExecTasks = [
  { id: 'et1', title: 'Finalize spring budget proposal', description: 'Review line items with VP Finance before Thursday exec meeting.', assigned_to_user_id: DEMO_USER_ID, assigned_position: 'President', status: 'open' as const, priority: 'high', due_at: daysFromNow(3), created_by: MID.jordan, created_at: daysAgo(2), updated_at: daysAgo(1) },
  { id: 'et2', title: 'Confirm venue for fundraising gala', description: 'Call Grand Ballroom and confirm AV setup.', assigned_to_user_id: DEMO_USER_ID, assigned_position: 'President', status: 'open' as const, priority: 'medium', due_at: daysFromNow(5), created_by: MID.casey, created_at: daysAgo(4), updated_at: daysAgo(2) },
  { id: 'et3', title: 'Review new member coffee chat progress', description: 'Check milestone completion rates for Gamma and Delta families.', assigned_to_user_id: DEMO_USER_ID, assigned_position: 'VP of New Member Education', status: 'open' as const, priority: 'medium', due_at: daysFromNow(7), created_by: MID.jordan, created_at: daysAgo(1), updated_at: daysAgo(1) },
];

export const demoNotifications = [
  { id: 'n1', user_id: DEMO_USER_ID, title: 'EOP Voting is Open', message: 'Cast your vote for this semester\'s candidates.', type: 'eop', link: '/eop', is_read: false, created_at: daysAgo(0), event_id: null, ticketed_event_id: null },
  { id: 'n2', user_id: DEMO_USER_ID, title: 'Chapter Meeting Tomorrow', message: 'Weekly Chapter Meeting starts at 7:00 PM.', type: 'event_reminder', link: '/events', is_read: false, created_at: daysAgo(0), event_id: 'e001', ticketed_event_id: null },
  { id: 'n3', user_id: DEMO_USER_ID, title: 'Coffee chat confirmation needed', message: 'Taylor Wright is waiting for your confirmation.', type: 'coffee_chat', link: '/chapter', is_read: true, created_at: daysAgo(1), event_id: null, ticketed_event_id: null },
  { id: 'n4', user_id: DEMO_USER_ID, title: 'Service hours approved', message: 'Your food bank hours have been verified.', type: 'service_hours', link: '/chapter', is_read: true, created_at: daysAgo(2), event_id: null, ticketed_event_id: null },
  { id: 'n5', user_id: DEMO_USER_ID, title: 'New exec task assigned', message: 'Finalize spring budget proposal', type: 'exec_task_assigned', link: '/chapter?tab=admin', is_read: true, created_at: daysAgo(2), event_id: null, ticketed_event_id: null },
];

export const demoAlumni = [
  { id: 'a1', first_name: 'David', last_name: 'Kim', email: 'david.kim@alumni.demo', graduation_year: 2022, major: 'Finance', company: 'Goldman Sachs', job_title: 'Analyst', industry: 'Investment Banking', linkedin_url: null, phone: null, notes: null, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'a2', first_name: 'Emily', last_name: 'Santos', email: 'emily.s@alumni.demo', graduation_year: 2021, major: 'Marketing', company: 'Google', job_title: 'Product Marketing Manager', industry: 'Technology', linkedin_url: null, phone: null, notes: null, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'a3', first_name: 'Michael', last_name: 'O\'Brien', email: 'michael.o@alumni.demo', graduation_year: 2020, major: 'Accounting', company: 'Deloitte', job_title: 'Senior Consultant', industry: 'Consulting', linkedin_url: null, phone: null, notes: null, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'a4', first_name: 'Sarah', last_name: 'Patel', email: 'sarah.p@alumni.demo', graduation_year: 2023, major: 'Entrepreneurship', company: 'Stripe', job_title: 'Business Operations', industry: 'Technology', linkedin_url: null, phone: null, notes: null, created_at: daysAgo(100), updated_at: daysAgo(100) },
  { id: 'a5', first_name: 'James', last_name: 'Williams', email: 'james.w@alumni.demo', graduation_year: 2019, major: 'Management', company: 'JPMorgan Chase', job_title: 'VP, Commercial Banking', industry: 'Banking', linkedin_url: null, phone: null, notes: null, created_at: daysAgo(100), updated_at: daysAgo(100) },
];

export const demoTicketedEvents = [
  { id: 'te1', title: 'Spring Formal', description: 'Annual chapter formal — semi-formal attire.', starts_at: daysFromNow(12, 19), ends_at: daysFromNow(12, 23), location: 'Harbor View Hotel', price_cents: 3500, capacity: 120, published: true, registrations_open: true, payment_url: null, payment_url_internal: true, created_by: DEMO_USER_ID, created_at: daysAgo(20), updated_at: daysAgo(1) },
  { id: 'te2', title: 'Alumni Golf Outing', description: 'Brotherhood golf tournament with alumni.', starts_at: daysFromNow(21, 8), ends_at: daysFromNow(21, 14), location: 'Oak Ridge Country Club', price_cents: 5000, capacity: 48, published: true, registrations_open: true, payment_url: null, payment_url_internal: true, created_by: MID.robin, created_at: daysAgo(15), updated_at: daysAgo(2) },
];

export const demoFamilyWeights = orgScoredCategories().map((cat, i) => ({
  id: `fw${i}`,
  category: cat,
  weight: 1,
  created_at: ts(now),
  updated_at: ts(now),
}));

export const demoFamilyBonusPoints = [
  { id: 'fb1', family_name: 'Alpha', points: 2, reason: 'Family games winner', created_by: DEMO_USER_ID, created_at: daysAgo(7), updated_at: daysAgo(7) },
  { id: 'fb2', family_name: 'Beta', points: 1, reason: 'Participation bonus', created_by: DEMO_USER_ID, created_at: daysAgo(7), updated_at: daysAgo(7) },
];

function orgScoredCategories() {
  return ['chapter', 'professionalism', 'brotherhood', 'fundraising', 'service'] as const;
}

export const demoEventRsvp = { response: 'going' };

export const demoCoffeeChatMilestones = [
  { id: 'm1', target_count: 10, deadline: daysFromNow(30), created_by: DEMO_USER_ID, created_at: daysAgo(60), updated_at: daysAgo(60) },
  { id: 'm2', target_count: 25, deadline: daysFromNow(60), created_by: DEMO_USER_ID, created_at: daysAgo(60), updated_at: daysAgo(60) },
  { id: 'm3', target_count: 50, deadline: daysFromNow(90), created_by: DEMO_USER_ID, created_at: daysAgo(60), updated_at: daysAgo(60) },
];

export const demoPdpAssignments = [
  { id: 'pa1', title: 'Professional Elevator Pitch', description: 'Record a 60-second elevator pitch.', due_date: daysFromNow(5), submission_type: 'both' as const, module_id: 'mod1', created_by: DEMO_USER_ID, created_at: daysAgo(14), updated_at: daysAgo(14) },
  { id: 'pa2', title: 'Chapter History Reflection', description: 'Write a 500-word reflection on DSP values.', due_date: daysFromNow(12), submission_type: 'text' as const, module_id: 'mod1', created_by: DEMO_USER_ID, created_at: daysAgo(14), updated_at: daysAgo(14) },
  { id: 'pa3', title: 'Resume Draft', description: 'Upload your first resume draft.', due_date: daysFromNow(20), submission_type: 'file' as const, module_id: 'mod2', created_by: DEMO_USER_ID, created_at: daysAgo(14), updated_at: daysAgo(14) },
];

export const demoPdpSubmissions = [
  { id: 'ps1', assignment_id: 'pa1', user_id: DEMO_USER_ID, content: 'Submitted pitch draft', file_urls: [], status: 'submitted' as const, created_at: daysAgo(2), updated_at: daysAgo(2) },
];

export const demoCareerHistory = [
  { id: 'cr1', tool: 'resume_review' as const, title: 'Finance Internship Resume', created_at: daysAgo(3), model: 'gpt-4', output: null, input: null },
  { id: 'cr2', tool: 'linkedin' as const, title: 'LinkedIn Profile Audit', created_at: daysAgo(7), model: 'gpt-4', output: null, input: null },
  { id: 'cr3', tool: 'interview_prep' as const, title: 'Investment Banking Prep', created_at: daysAgo(14), model: 'gpt-4', output: null, input: null },
];

function demoNextMonday(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff + 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const demoCareerCredits = {
  weeklyRemaining: 1,
  bonusRemaining: 3,
  total: 4,
  nextReset: demoNextMonday(),
};

const currentSemester = () => {
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
};

export const demoSemester = currentSemester();

export const demoDuesConfig = [
  { id: 'dc1', tier_name: 'Active Member', member_status: 'active', amount: 450, semester: demoSemester, is_active: true, created_at: daysAgo(90), updated_at: daysAgo(90) },
];

export const demoDuesLineItems = [
  { id: 'dl1', user_id: DEMO_USER_ID, semester: demoSemester, type: 'payment', amount: -150, description: 'Installment 1 payment', created_by: MID.casey, created_at: daysAgo(45), },
];

export const demoDuesInstallments = [
  { id: 'di1', user_id: DEMO_USER_ID, semester: demoSemester, installment_number: 1, amount: 150, due_date: daysAgo(30), paid: true, created_at: daysAgo(90) },
  { id: 'di2', user_id: DEMO_USER_ID, semester: demoSemester, installment_number: 2, amount: 150, due_date: daysAgo(5), paid: false, created_at: daysAgo(90) },
  { id: 'di3', user_id: DEMO_USER_ID, semester: demoSemester, installment_number: 3, amount: 150, due_date: daysFromNow(25), paid: false, created_at: daysAgo(90) },
];

export const demoDuesLateFees: Array<{ id: string; semester: string; fee_amount: number; deadline: string; description: string | null; is_active: boolean; created_at: string }> = [];

export const demoChapterSettings: Record<string, unknown> = {
  dues_home_widget_visible: true,
  custom_point_categories: ['chapter', 'professionalism', 'brotherhood', 'fundraising', 'service'],
  service_hours_requirement: 3,
};

export function getDemoMember(id: string) {
  return demoMembers.find((m) => m.id === id) ?? null;
}

export function getDemoMemberByUserId(userId: string) {
  return demoMembers.find((m) => m.user_id === userId) ?? null;
}

export function getDemoMemberPoints(userId: string) {
  return demoPointsLedger.filter((p) => p.user_id === userId);
}

export function getDemoServiceHours(userId?: string) {
  if (!userId) return demoServiceHours;
  return demoServiceHours.filter((h) => h.user_id === userId);
}

export function getDemoMyCoffeeChats(userId: string) {
  return demoCoffeeChats.filter((c) => c.initiator_id === userId || c.partner_id === userId);
}

export function getDemoMyExecTasks(userId: string) {
  return demoExecTasks.filter((t) => t.assigned_to_user_id === userId && t.status === 'open');
}

export function getDemoNotifications(userId: string) {
  return demoNotifications.filter((n) => n.user_id === userId);
}

export function getDemoUnreadCount(userId: string) {
  return demoNotifications.filter((n) => n.user_id === userId && !n.is_read).length;
}

export function getDemoMySubmissions(userId: string) {
  return demoPdpSubmissions.filter((s) => s.user_id === userId);
}

export function getDemoCareerHistory(userId: string, tool?: string) {
  let rows = demoCareerHistory.map((r) => ({ ...r, user_id: userId }));
  if (tool) rows = rows.filter((r) => r.tool === tool);
  return rows;
}

export function getDemoDuesInstallments(userId: string, semester: string) {
  return demoDuesInstallments.filter((i) => i.user_id === userId && i.semester === semester);
}

export function getDemoDuesLineItems(userId: string, semester: string) {
  return demoDuesLineItems.filter((i) => i.user_id === userId && i.semester === semester);
}

export function getDemoChapterSetting(key: string, whenMissing?: unknown) {
  return key in demoChapterSettings ? demoChapterSettings[key] : (whenMissing ?? null);
}

export const demoEopVotingOpen = demoEopCandidates.filter((c) => c.voting_open);

export const demoNotificationPreferences = {
  id: 'np1',
  user_id: DEMO_USER_ID,
  push_enabled: true,
  email_notifications: true,
  service_hours_notifications: true,
  coffee_chat_notifications: true,
  job_board_notifications: true,
  event_notifications: true,
  announcement_notifications: true,
  event_reminder_24h: true,
  exec_task_notifications: true,
  data_usage_consent: true,
  data_usage_consent_updated_at: daysAgo(30),
};
