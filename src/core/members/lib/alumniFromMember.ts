import { Tables, TablesInsert } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type Alumni = Tables<'alumni'>;
type AlumniInsert = TablesInsert<'alumni'>;

function samePerson(member: Profile, alum: Pick<Alumni, 'email' | 'first_name' | 'last_name' | 'graduation_year'>) {
  const memberEmail = member.email?.trim().toLowerCase();
  const alumEmail = alum.email?.trim().toLowerCase();
  if (memberEmail && alumEmail && memberEmail === alumEmail) return true;

  return (
    alum.first_name.trim().toLowerCase() === member.first_name.trim().toLowerCase() &&
    alum.last_name.trim().toLowerCase() === member.last_name.trim().toLowerCase() &&
    alum.graduation_year === member.graduation_year
  );
}

export function missingAlumniContacts(members: Profile[], alumni: Alumni[]): Profile[] {
  return members.filter((member) => !alumni.some((alum) => samePerson(member, alum)));
}

export function toAlumniInsert(member: Profile): AlumniInsert {
  return {
    first_name: member.first_name,
    last_name: member.last_name,
    email: member.email,
    phone: member.phone,
    graduation_year: member.graduation_year,
    linkedin_url: member.linkedin_url,
  };
}
