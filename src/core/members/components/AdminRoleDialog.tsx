import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AdminRoleDialogProps {
  member: Tables<'profiles'>;
}

export function AdminRoleDialog({ member }: AdminRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['member-roles', member.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', member.user_id);

      if (error) throw error;
      return data.map((entry) => entry.role);
    },
    enabled: open,
  });

  const isAdmin = roles.includes('admin');

  const toggleAdminRole = useMutation({
    mutationFn: async () => {
      if (isAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', member.user_id)
          .eq('role', 'admin');

        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: member.user_id, role: 'admin' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-roles', member.user_id] });
      toast({
        title: isAdmin ? 'Admin role removed' : 'Admin role granted',
        description: `${member.first_name} ${member.last_name} was ${isAdmin ? 'removed from' : 'added to'} admins.`,
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Unable to update admin role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 gap-1.5 bg-background/90">
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Admin role access</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? `Remove admin role from ${member.first_name} ${member.last_name}?`
              : `Grant admin role to ${member.first_name} ${member.last_name}?`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => toggleAdminRole.mutate()} disabled={toggleAdminRole.isPending}>
            {toggleAdminRole.isPending ? 'Saving...' : isAdmin ? 'Remove admin' : 'Grant admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
