import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, AlertCircle } from 'lucide-react';
import { parseCSV } from '@/lib/csv';
import { useBulkCreateCandidates } from '@/hooks/useEOP';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EOPCSVRow {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  video_score?: string;
  interview_score?: string;
  r1_pu?: string;
  r2_pu?: string;
  tu_td?: string;
  eligible_voters?: string;
  notes?: string;
}

export function EOPImportDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<EOPCSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useBulkCreateCandidates();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV<EOPCSVRow>(file);
      const validationErrors: string[] = [];

      data.forEach((row, index) => {
        if (!row.first_name || !row.last_name) {
          validationErrors.push(`Row ${index + 1}: Missing required first_name or last_name`);
        }
      });

      setErrors(validationErrors);
      setPreview(data);
    } catch (error) {
      setErrors(['Failed to parse CSV file']);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    const validCandidates = preview
      .filter(row => row.first_name && row.last_name)
      .map(row => ({
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email || null,
        phone: row.phone || null,
        video_score: row.video_score ? parseInt(row.video_score) : null,
        interview_score: row.interview_score ? parseInt(row.interview_score) : null,
        r1_pu: row.r1_pu || null,
        r2_pu: row.r2_pu || null,
        tu_td: row.tu_td ? parseInt(row.tu_td) : 0,
        eligible_voters: row.eligible_voters ? parseInt(row.eligible_voters) : 0,
        notes: row.notes || null,
      }));

    await bulkCreate.mutateAsync(validCandidates);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setPreview([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import PNMs from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Upload a CSV file with the following columns:</p>
            <code className="text-xs bg-muted p-2 rounded block">
              first_name, last_name, email, phone, video_score, interview_score, r1_pu, r2_pu, tu_td, eligible_voters, notes
            </code>
            <p className="mt-2 text-xs">Required: first_name, last_name. All other fields are optional.</p>
          </div>

          <Input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <p className="text-sm font-medium mb-2">Preview ({preview.length} rows)</p>
              <ScrollArea className="flex-1 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Video Score</TableHead>
                      <TableHead>Interview Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i} className={!row.first_name || !row.last_name ? 'bg-destructive/10' : ''}>
                        <TableCell>{row.first_name || '-'}</TableCell>
                        <TableCell>{row.last_name || '-'}</TableCell>
                        <TableCell>{row.email || '-'}</TableCell>
                        <TableCell>{row.video_score || '-'}</TableCell>
                        <TableCell>{row.interview_score || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={errors.length > 0 || preview.length === 0 || bulkCreate.isPending}
            >
              {bulkCreate.isPending ? 'Importing...' : `Import ${preview.filter(r => r.first_name && r.last_name).length} PNMs`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
