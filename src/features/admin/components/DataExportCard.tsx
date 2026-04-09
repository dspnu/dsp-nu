import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, Trash2 } from 'lucide-react';
import { useAdminDataExport } from '@/features/admin/hooks/useAdminDataExport';
import { hasPosition } from '@/config/org';
import { useAuth } from '@/core/auth/AuthContext';
import type { ExportDatasetId, ExportFormat } from '@/features/admin/lib/exportRegistry';

const DEFAULT_FORMAT: ExportFormat = 'xlsx';

export function DataExportCard() {
  const { profile } = useAuth();
  const isPresident = hasPosition(profile, 'President');

  const {
    datasets,
    isExporting,
    progress,
    lastExport,
    generateExport,
    purgeAfterExport,
  } = useAdminDataExport();

  const defaultIds = useMemo(
    () => datasets.filter((d) => d.defaultSelected).map((d) => d.id),
    [datasets]
  );

  const [format, setFormat] = useState<ExportFormat>(DEFAULT_FORMAT);
  const [selectedIds, setSelectedIds] = useState<ExportDatasetId[]>(defaultIds);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [semester, setSemester] = useState('');

  const [purgeEnabled, setPurgeEnabled] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  if (!isPresident) return null;

  const toggleDataset = (id: ExportDatasetId) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filters = {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    semester: semester || undefined,
  };

  const canPurge =
    !!lastExport &&
    purgeEnabled &&
    purgeConfirm.trim() === 'PURGE' &&
    !!fromDate &&
    !!toDate &&
    selectedIds.length > 0;

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one dataset to export.');
      return;
    }

    await generateExport({
      format,
      datasetIds: selectedIds,
      filters,
    });
  };

  const handlePurge = async () => {
    if (!canPurge) return;

    setIsPurging(true);
    try {
      await purgeAfterExport({
        datasetIds: selectedIds,
        fromDate,
        toDate,
      });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel workbook (.xlsx)</SelectItem>
                <SelectItem value="zip_csv">ZIP of CSVs (.zip)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label>Semester (optional)</Label>
            <Input
              placeholder="Fall 2024"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Only applies to dues datasets.
            </p>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Datasets</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {datasets.map((d) => {
                const checked = selectedIds.includes(d.id);
                return (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleDataset(d.id)}
                    />
                    <span className="text-sm">{d.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? 'Generating…' : 'Generate export'}
          </Button>
          {lastExport && (
            <Badge variant="secondary">
              Downloaded: {lastExport.filename}
            </Badge>
          )}
        </div>

        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.label ?? 'Working…'}</span>
              <span className="font-medium">
                {progress.current}/{progress.total}
              </span>
            </div>
            <Progress value={progress.total ? (progress.current / progress.total) * 100 : 0} />
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Purge after export (optional)</p>
              <p className="text-xs text-muted-foreground">
                Deletes records in the selected date range after you export. This is irreversible.
              </p>
            </div>
            <Checkbox checked={purgeEnabled} onCheckedChange={(v) => setPurgeEnabled(Boolean(v))} />
          </div>

          {purgeEnabled && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Type PURGE to confirm</Label>
                <Input
                  value={purgeConfirm}
                  onChange={(e) => setPurgeConfirm(e.target.value)}
                  placeholder="PURGE"
                />
                {!lastExport && (
                  <p className="text-xs text-muted-foreground">
                    Purge is only enabled after a successful export download.
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <Button
                  variant="destructive"
                  className="gap-2 w-full"
                  disabled={!canPurge || isPurging}
                  onClick={handlePurge}
                >
                  <Trash2 className="h-4 w-4" />
                  {isPurging ? 'Purging…' : 'Purge data'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

