-- Create enums for various statuses
CREATE TYPE public.member_status AS ENUM ('active', 'alumni', 'new_mem', 'shiny', 'pnm');
CREATE TYPE public.app_role AS ENUM ('admin', 'officer', 'member');
CREATE TYPE public.event_category AS ENUM ('chapter', 'rush', 'fundraising', 'service', 'brotherhood', 'professionalism', 'dei');
CREATE TYPE public.job_type AS ENUM ('internship', 'full_time', 'part_time', 'contract');
CREATE TYPE public.coffee_chat_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE public.eop_vote AS ENUM ('yes', 'no', 'abstain');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  graduation_year INTEGER,
  major TEXT,
  status member_status NOT NULL DEFAULT 'active',
  positions TEXT[] DEFAULT '{}',
  committees TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create dues_payments table
CREATE TABLE public.dues_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  semester TEXT NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category event_category NOT NULL DEFAULT 'chapter',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  points_value INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  organizer_id UUID REFERENCES auth.users(id),
  attendance_open BOOLEAN NOT NULL DEFAULT false,
  qr_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_rsvps table
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_in_by UUID REFERENCES auth.users(id),
  is_excused BOOLEAN NOT NULL DEFAULT false,
  excuse_notes TEXT,
  UNIQUE (event_id, user_id)
);

-- Create points_ledger table
CREATE TABLE public.points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category event_category NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_posts table
CREATE TABLE public.job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  job_type job_type NOT NULL DEFAULT 'full_time',
  location TEXT,
  description TEXT,
  apply_url TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  is_approved BOOLEAN NOT NULL DEFAULT true,
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_bookmarks table
CREATE TABLE public.job_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id)
);

-- Create alumni table
CREATE TABLE public.alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  graduation_year INTEGER,
  company TEXT,
  job_title TEXT,
  industry TEXT,
  location TEXT,
  linkedin_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  folder TEXT NOT NULL DEFAULT 'general',
  file_url TEXT,
  file_type TEXT,
  is_officer_only BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coffee_chats table
CREATE TABLE public.coffee_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chat_date DATE NOT NULL,
  notes TEXT,
  proof_url TEXT,
  status coffee_chat_status NOT NULL DEFAULT 'pending',
  confirmed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create eop_candidates (PNMs) table
CREATE TABLE public.eop_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  voting_open BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create eop_votes table
CREATE TABLE public.eop_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.eop_candidates(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote eop_vote NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, voter_id)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coffee_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eop_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eop_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or officer
CREATE OR REPLACE FUNCTION public.is_admin_or_officer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'officer')
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for dues_payments
CREATE POLICY "Users can view own dues" ON public.dues_payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin/Officers can view all dues" ON public.dues_payments FOR SELECT TO authenticated USING (public.is_admin_or_officer(auth.uid()));
CREATE POLICY "Admin/Officers can manage dues" ON public.dues_payments FOR ALL TO authenticated USING (public.is_admin_or_officer(auth.uid()));

-- RLS Policies for events
CREATE POLICY "All authenticated users can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Officers can manage events" ON public.events FOR ALL TO authenticated USING (public.is_admin_or_officer(auth.uid()));

-- RLS Policies for event_rsvps
CREATE POLICY "Users can view all RSVPs" ON public.event_rsvps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own RSVPs" ON public.event_rsvps FOR ALL TO authenticated USING (user_id = auth.uid());

-- RLS Policies for attendance
CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin/Officers can view all attendance" ON public.attendance FOR SELECT TO authenticated USING (public.is_admin_or_officer(auth.uid()));
CREATE POLICY "Admin/Officers can manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.is_admin_or_officer(auth.uid()));
CREATE POLICY "Users can check in themselves" ON public.attendance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- RLS Policies for points_ledger
CREATE POLICY "Users can view own points" ON public.points_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin/Officers can view all points" ON public.points_ledger FOR SELECT TO authenticated USING (public.is_admin_or_officer(auth.uid()));
CREATE POLICY "Admin/Officers can manage points" ON public.points_ledger FOR ALL TO authenticated USING (public.is_admin_or_officer(auth.uid()));

-- RLS Policies for job_posts
CREATE POLICY "All authenticated users can view approved jobs" ON public.job_posts FOR SELECT TO authenticated USING (is_approved = true OR posted_by = auth.uid());
CREATE POLICY "Admin/Officers can manage jobs" ON public.job_posts FOR ALL TO authenticated USING (public.is_admin_or_officer(auth.uid()));
CREATE POLICY "Users can post jobs" ON public.job_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = posted_by);

-- RLS Policies for job_bookmarks
CREATE POLICY "Users can manage own bookmarks" ON public.job_bookmarks FOR ALL TO authenticated USING (user_id = auth.uid());

-- RLS Policies for alumni
CREATE POLICY "All authenticated users can view alumni" ON public.alumni FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Officers can manage alumni" ON public.alumni FOR ALL TO authenticated USING (public.is_admin_or_officer(auth.uid()));

-- RLS Policies for resources
CREATE POLICY "Users can view public resources" ON public.resources FOR SELECT TO authenticated USING (is_officer_only = false OR public.is_admin_or_officer(auth.uid()));
CREATE POLICY "Admin/Officers can manage resources" ON public.resources FOR ALL TO authenticated USING (public.is_admin_or_officer(auth.uid()));

-- RLS Policies for coffee_chats
CREATE POLICY "Users can view own coffee chats" ON public.coffee_chats FOR SELECT TO authenticated USING (initiator_id = auth.uid() OR partner_id = auth.uid());
CREATE POLICY "Admin/Officers can view all coffee chats" ON public.coffee_chats FOR SELECT TO authenticated USING (public.is_admin_or_officer(auth.uid()));
CREATE POLICY "Users can create coffee chats" ON public.coffee_chats FOR INSERT TO authenticated WITH CHECK (initiator_id = auth.uid());
CREATE POLICY "Users can update own coffee chats" ON public.coffee_chats FOR UPDATE TO authenticated USING (initiator_id = auth.uid() OR partner_id = auth.uid());

-- RLS Policies for eop_candidates
CREATE POLICY "All authenticated users can view candidates" ON public.eop_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Officers can manage candidates" ON public.eop_candidates FOR ALL TO authenticated USING (public.is_admin_or_officer(auth.uid()));

-- RLS Policies for eop_votes
CREATE POLICY "Users can view own votes" ON public.eop_votes FOR SELECT TO authenticated USING (voter_id = auth.uid());
CREATE POLICY "Admin/Officers can view vote counts" ON public.eop_votes FOR SELECT TO authenticated USING (public.is_admin_or_officer(auth.uid()));
CREATE POLICY "Users can cast votes" ON public.eop_votes FOR INSERT TO authenticated WITH CHECK (voter_id = auth.uid());

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  
  -- Assign default member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_rsvps_updated_at BEFORE UPDATE ON public.event_rsvps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON public.job_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alumni_updated_at BEFORE UPDATE ON public.alumni FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coffee_chats_updated_at BEFORE UPDATE ON public.coffee_chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_eop_candidates_updated_at BEFORE UPDATE ON public.eop_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();