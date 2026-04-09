import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { toCSV } from '@/lib/csv';
import { downloadBlob } from '@/lib/download';
import { exportDatasets, type ExportDatasetId, type ExportFilters, type ExportFormat } from '@/features/admin/lib/exportRegistry';
import { supabase } from '@/integrations/supabase/client';

type ExportResult = {
  filename: string;
  datasetIds: ExportDatasetId[];
  rowCounts: Record<string, number>;
};

function formatDateForFilename(d: Date) {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function safeSheetName(name: string) {
  // Excel sheet name constraints: <= 31 chars, cannot contain : \ / ? * [ ]
  const cleaned = name.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
  return cleaned.length ? cleaned : 'Sheet';
}

function getErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Unexpected error';
}

export function useAdminDataExport() {
  const datasets = useMemo(() => exportDatasets, []);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label?: string } | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const generateExport = useCallback(async (opts: {
    format: ExportFormat;
    datasetIds: ExportDatasetId[];
    filters: ExportFilters;
  }) => {
    const { format, datasetIds, filters } = opts;

    const selected = datasets.filter((d) => datasetIds.includes(d.id));
    if (selected.length === 0) {
      toast.error('Select at least one dataset to export.');
      return;
    }

    setIsExporting(true);
    setLastExport(null);
    setProgress({ current: 0, total: selected.length, label: 'Starting…' });

    try {
      const rowCounts: Record<string, number> = {};

      if (format === 'xlsx') {
        const wb = XLSX.utils.book_new();

        for (let i = 0; i < selected.length; i++) {
          const ds = selected[i];
          setProgress({ current: i, total: selected.length, label: `Fetching ${ds.label}…` });
          const rows = await ds.fetchRows(filters);
          rowCounts[ds.id] = rows.length;

          const sheet = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(ds.sheetName));
          setProgress({ current: i + 1, total: selected.length, label: `Added ${ds.sheetName}` });
        }

        const base = `dsp-nu-export_${formatDateForFilename(new Date())}`;
        const filename = `${base}.xlsx`;
        const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        downloadBlob(blob, filename);
        setLastExport({ filename, datasetIds, rowCounts });
        toast.success('Export downloaded.');
        return;
      }

      if (format === 'zip_csv') {
        const zip = new JSZip();

        for (let i = 0; i < selected.length; i++) {
          const ds = selected[i];
          setProgress({ current: i, total: selected.length, label: `Fetching ${ds.label}…` });
          const rows = await ds.fetchRows(filters);
          rowCounts[ds.id] = rows.length;

          const csv = toCSV(rows);
          zip.file(`${ds.sheetName}.csv`, csv);
          setProgress({ current: i + 1, total: selected.length, label: `Added ${ds.sheetName}.csv` });
        }

        const base = `dsp-nu-export_${formatDateForFilename(new Date())}`;
        const filename = `${base}.zip`;
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, filename);
        setLastExport({ filename, datasetIds, rowCounts });
        toast.success('Export downloaded.');
        return;
      }

      toast.error('Unknown export format.');
    } catch (e: unknown) {
      console.error(e);
      toast.error(getErrorMessage(e) ?? 'Failed to generate export.');
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }, [datasets]);

  const purgeAfterExport = useCallback(async (opts: {
    datasetIds: ExportDatasetId[];
    fromDate: string;
    toDate: string;
  }) => {
    const { datasetIds, fromDate, toDate } = opts;
    if (!fromDate || !toDate) {
      toast.error('Select a date range to purge.');
      return null;
    }
    if (datasetIds.length === 0) {
      toast.error('Select at least one dataset to purge.');
      return null;
    }

    try {
      type RpcResponse = { data: unknown; error: unknown };
      type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => Promise<RpcResponse> };
      const rpc = (supabase as unknown as RpcClient);

      // Not in generated types yet; safe runtime call.
      const { data, error } = await rpc.rpc('purge_exported_data', {
        p_from: fromDate,
        p_to: toDate,
        p_datasets: datasetIds,
      });
      if (error) throw error;
      toast.success('Purge completed.');
      return data;
    } catch (e: unknown) {
      console.error(e);
      toast.error(getErrorMessage(e) ?? 'Failed to purge data.');
      return null;
    }
  }, []);

  return {
    datasets,
    isExporting,
    progress,
    lastExport,
    generateExport,
    purgeAfterExport,
  };
}

