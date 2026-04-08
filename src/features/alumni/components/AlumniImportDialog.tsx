import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { useBulkCreateAlumni } from '@/features/alumni/hooks/useAlumni';
import { parseCSV } from '@/lib/csv';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AlumniCSVRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  industry?: string;
  location?: string;
  graduation_year?: string;
  linkedin_url?: string;
  notes?: string;
}

export function AlumniImportDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<AlumniCSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useBulkCreateAlumni();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV<AlumniCSVRow>(file);
      const validationErrors: string[] = [];
      
      // Validate required fields
      data.forEach((row, index) => {
        if (!row.first_name?.trim()) {
          validationErrors.push(`Row ${index + 1}: Missing first_name`);
        }
        if (!row.last_name?.trim()) {
          validationErrors.push(`Row ${index + 1}: Missing last_name`);
        }
      });

      setErrors(validationErrors);
      setPreview(data.slice(0, 10)); // Preview first 10 rows
    } catch (error) {
      setErrors(['Failed to parse CSV file. Please check the format.']);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (errors.length > 0 || preview.length === 0) return;

    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV<AlumniCSVRow>(file);
      
      const alumniToInsert = data
        .filter(row => row.first_name?.trim() && row.last_name?.trim())
        .map(row => ({
          first_name: row.first_name!.trim(),
          last_name: row.last_name!.trim(),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          company: row.company?.trim() || null,
          job_title: row.job_title?.trim() || null,
          industry: row.industry?.trim() || null,
          location: row.location?.trim() || null,
          graduation_year: row.graduation_year ? parseInt(row.graduation_year) : null,
          linkedin_url: row.linkedin_url?.trim() || null,
          notes: row.notes?.trim() || null,
        }));

      await bulkCreate.mutateAsync(alumniToInsert);
      setOpen(false);
      setPreview([]);
      setErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setPreview([]);
      setErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Alumni from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              CSV should have headers: <code className="text-xs bg-muted px-1 rounded">first_name, last_name, email, phone, company, job_title, industry, location, graduation_year, linkedin_url, notes</code>
            </AlertDescription>
          </Alert>

          {/* File Input */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {preview.length > 0 && errors.length === 0 && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {preview.length}+ records ready to import. Showing preview below.
                </AlertDescription>
              </Alert>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Year</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {row.first_name} {row.last_name}
                        </TableCell>
                        <TableCell>{row.email || '-'}</TableCell>
                        <TableCell>{row.company || '-'}</TableCell>
                        <TableCell>{row.job_title || '-'}</TableCell>
                        <TableCell>{row.graduation_year || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={preview.length === 0 || errors.length > 0 || bulkCreate.isPending}
            >
              {bulkCreate.isPending ? 'Importing...' : 'Import Alumni'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
