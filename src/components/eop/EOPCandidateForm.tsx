import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Pencil, Upload } from 'lucide-react';
import { useCreateCandidate, useUpdateCandidate } from '@/hooks/useEOP';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type EOPCandidate = Tables<'eop_candidates'>;

const candidateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  video_score: z.coerce.number().min(0).max(100).optional().nullable(),
  interview_score: z.coerce.number().min(0).max(100).optional().nullable(),
  r1_pu: z.string().optional(),
  r2_pu: z.string().optional(),
  tu_td: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
  eligible_voters: z.coerce.number().min(0).optional().nullable(),
});

type CandidateFormValues = z.infer<typeof candidateSchema>;

interface EOPCandidateFormProps {
  candidate?: EOPCandidate & {
    picture_url?: string | null;
    video_score?: number | null;
    interview_score?: number | null;
    r1_pu?: string | null;
    r2_pu?: string | null;
    tu_td?: number | null;
    eligible_voters?: number | null;
  };
  trigger?: React.ReactNode;
}

export function EOPCandidateForm({ candidate, trigger }: EOPCandidateFormProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pictureUrl, setPictureUrl] = useState(candidate?.picture_url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const isEditing = !!candidate;

  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      first_name: candidate?.first_name || '',
      last_name: candidate?.last_name || '',
      video_score: candidate?.video_score ?? null,
      interview_score: candidate?.interview_score ?? null,
      r1_pu: candidate?.r1_pu || '',
      r2_pu: candidate?.r2_pu || '',
      tu_td: candidate?.tu_td ?? 0,
      notes: candidate?.notes || '',
      eligible_voters: candidate?.eligible_voters ?? 0,
    },
  });

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pnm-pictures')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pnm-pictures')
        .getPublicUrl(fileName);

      setPictureUrl(publicUrl);
      toast.success('Picture uploaded');
    } catch (error) {
      toast.error('Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: CandidateFormValues) => {
    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      picture_url: pictureUrl || null,
      video_score: values.video_score ?? null,
      interview_score: values.interview_score ?? null,
      r1_pu: values.r1_pu || null,
      r2_pu: values.r2_pu || null,
      tu_td: values.tu_td ?? 0,
      notes: values.notes || null,
      eligible_voters: values.eligible_voters ?? 0,
    };
    
    if (isEditing) {
      await updateCandidate.mutateAsync({ id: candidate.id, ...payload });
    } else {
      await createCandidate.mutateAsync(payload);
    }
    form.reset();
    setPictureUrl('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add PNM
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit PNM' : 'Add PNM'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Picture Upload */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={pictureUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {form.watch('first_name')?.[0]}{form.watch('last_name')?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePictureUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Picture'}
                </Button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="video_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Score</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interview_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interview Score</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PU Fields */}
            <FormField
              control={form.control}
              name="r1_pu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>R1 PU</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Round 1 Professional Update" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="r2_pu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>R2 PU</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Round 2 Professional Update" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* TU/TD and Eligible Voters */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tu_td"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TU/TD (+/-)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? 0}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eligible_voters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eligible Voters</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        {...field} 
                        value={field.value ?? 0}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCandidate.isPending || updateCandidate.isPending}>
                {isEditing ? 'Save' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function EditCandidateButton({ candidate }: { candidate: EOPCandidate }) {
  return (
    <EOPCandidateForm
      candidate={candidate as any}
      trigger={
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );
}
