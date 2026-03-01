import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, Users, FileSpreadsheet } from 'lucide-react';
import { useApprovedMembers, useImportApprovedMembers, useDeleteAllApprovedMembers } from '@/hooks/useApprovedMembers';
import { parseCSV } from '@/lib/csv';

export function ApprovedMembersImport() {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: members, isLoading } = useApprovedMembers();
  const importMembers = useImportApprovedMembers();
  const deleteAll = useDeleteAllApprovedMembers();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseCSV<Record<string, string>>(file);
      await importMembers.mutateAsync(rows);
    } catch (err) {
      console.error('CSV parse error:', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          Manage Approved Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Approved Coffee Chat Members</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Upload a CSV with columns: First Name, Last Name, OSU Email, Current DSP Position, Major(s), Minor(s), Hometown, State, School Year, Pledge Class, Family, Grand Big, Big, Little(s), OSU Involvements, Past and Upcoming Internships/Experiences, Hobbies/Interests, Fun Facts About Yourself.
        </p>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importMembers.isPending}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {importMembers.isPending ? 'Importing...' : 'Upload CSV'}
          </Button>

          {members && members.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteAll.mutate()}
              disabled={deleteAll.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Clear List
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{members?.length || 0} approved members loaded</span>
        </div>

        {members && members.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                <span className="font-medium text-foreground">{m.first_name} {m.last_name}</span>
                <div className="flex items-center gap-2">
                  {m.dsp_position && <Badge variant="secondary" className="text-[10px]">{m.dsp_position}</Badge>}
                  {m.pledge_class && <span className="text-xs text-muted-foreground">{m.pledge_class}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
