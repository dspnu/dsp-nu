import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Constants } from '@/integrations/supabase/types';

const categories = Constants.public.Enums.event_category;

const grantPointsSchema = z.object({
  user_id: z.string().min(1, 'Member is required'),
  points: z.coerce.number().int().min(-100).max(100),
  category: z.enum(categories as unknown as [string, ...string[]]),
  reason: z.string().min(1, 'Reason is required').max(200),
});

type GrantPointsValues = z.infer<typeof grantPointsSchema>;

export function GrantPointsDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data: members } = useMembers();
  const queryClient = useQueryClient();

  const form = useForm<GrantPointsValues>({
    resolver: zodResolver(grantPointsSchema),
    defaultValues: {
      user_id: '',
      points: 1,
      category: 'chapter',
      reason: '',
    },
  });

  const grantPoints = useMutation({
    mutationFn: async (values: GrantPointsValues) => {
      const member = members?.find(m => m.id === values.user_id);
      if (!member) throw new Error('Member not found');
      
      const { error } = await supabase.from('points_ledger').insert({
        user_id: member.user_id,
        points: values.points,
        category: values.category as typeof categories[number],
        reason: values.reason,
        granted_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Points granted successfully');
      queryClient.invalidateQueries({ queryKey: ['all-points'] });
      queryClient.invalidateQueries({ queryKey: ['member-points'] });
      form.reset();
      setOpen(false);
    },
    onError: () => {
      toast.error('Failed to grant points');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Grant Points
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grant Points</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => grantPoints.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members?.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="capitalize">
                            {cat === 'dei' ? 'DE&I' : cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Why are you granting these points?" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={grantPoints.isPending}>
                Grant Points
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
