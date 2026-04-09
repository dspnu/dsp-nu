import { supabase } from '@/integrations/supabase/client';
import { org } from '@/config/org';
import type { Tables } from '@/integrations/supabase/types';

export type ExportFormat = 'xlsx' | 'zip_csv';

export type ExportFilters = {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  semester?: string;
};

export type ExportDatasetId =
  | 'profiles'
  | 'events'
  | 'event_rsvps'
  | 'attendance'
  | 'service_hours'
  | 'points_ledger'
  | 'dues_payments'
  | 'dues_line_items'
  | 'dues_installments'
  | 'dues_late_fees'
  | 'dues_config'
  | 'ticketed_events'
  | 'event_tickets'
  | 'audit_logs';

export type ExportDataset = {
  id: ExportDatasetId;
  label: string;
  sheetName: string;
  defaultSelected: boolean;
  dateColumn?: string;
  semesterColumn?: string;
  enabled?: boolean;
  fetchRows: (filters: ExportFilters) => Promise<Record<string, unknown>[]>;
};

function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function normalizeRows<T extends Record<string, unknown>>(rows: T[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) out[k] = normalizeCellValue(v);
    return out;
  });
}

async function fetchAllFromTable(opts: {
  table: string;
  select?: string;
  dateColumn?: string;
  semesterColumn?: string;
  filters: ExportFilters;
  pageSize?: number;
}): Promise<Record<string, unknown>[]> {
  const { table, select = '*', filters, dateColumn, semesterColumn, pageSize = 1000 } = opts;

  const all: Record<string, unknown>[] = [];
  let offset = 0;

  const fromISO = filters.fromDate ? `${filters.fromDate}T00:00:00.000Z` : undefined;
  const toISO = filters.toDate ? `${filters.toDate}T23:59:59.999Z` : undefined;

  while (true) {
    let q = supabase.from(table as any).select(select) as any;
    q = q.range(offset, offset + pageSize - 1);

    if (dateColumn && fromISO) q = q.gte(dateColumn, fromISO);
    if (dateColumn && toISO) q = q.lte(dateColumn, toISO);
    if (semesterColumn && filters.semester) q = q.eq(semesterColumn, filters.semester);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as Record<string, unknown>[];
    all.push(...rows);

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return normalizeRows(all);
}

export const exportDatasets: ExportDataset[] = ([
  {
    id: 'profiles' as ExportDatasetId,
    label: 'Members (profiles)',
    sheetName: 'Members',
    defaultSelected: true,
    dateColumn: 'updated_at',
    fetchRows: (filters) => fetchAllFromTable({ table: 'profiles', filters, dateColumn: 'updated_at' }),
  },
  {
    id: 'events' as ExportDatasetId,
    label: 'Events',
    sheetName: 'Events',
    defaultSelected: true,
    dateColumn: 'start_time',
    fetchRows: (filters) => fetchAllFromTable({ table: 'events', filters, dateColumn: 'start_time' }),
  },
  {
    id: 'event_rsvps' as ExportDatasetId,
    label: 'Event RSVPs',
    sheetName: 'Event_RSVPs',
    defaultSelected: true,
    dateColumn: 'updated_at',
    fetchRows: (filters) => fetchAllFromTable({ table: 'event_rsvps', filters, dateColumn: 'updated_at' }),
  },
  {
    id: 'attendance' as ExportDatasetId,
    label: 'Attendance records',
    sheetName: 'Attendance',
    defaultSelected: true,
    dateColumn: 'checked_in_at',
    fetchRows: (filters) => fetchAllFromTable({ table: 'attendance', filters, dateColumn: 'checked_in_at' }),
  },
  {
    id: 'service_hours' as ExportDatasetId,
    label: 'Service hours',
    sheetName: 'Service_Hours',
    defaultSelected: true,
    dateColumn: 'service_date',
    fetchRows: (filters) => fetchAllFromTable({ table: 'service_hours', filters, dateColumn: 'service_date' }),
  },
  {
    id: 'points_ledger' as ExportDatasetId,
    label: 'Points ledger',
    sheetName: 'Points_Ledger',
    defaultSelected: true,
    dateColumn: 'created_at',
    fetchRows: (filters) => fetchAllFromTable({ table: 'points_ledger', filters, dateColumn: 'created_at' }),
  },
  {
    id: 'dues_payments' as ExportDatasetId,
    label: 'Dues payments',
    sheetName: 'Dues_Payments',
    defaultSelected: true,
    dateColumn: 'paid_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable({ table: 'dues_payments', filters, dateColumn: 'paid_at', semesterColumn: 'semester' }),
  },
  {
    id: 'dues_line_items' as ExportDatasetId,
    label: 'Dues line items',
    sheetName: 'Dues_Line_Items',
    defaultSelected: true,
    dateColumn: 'created_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable({ table: 'dues_line_items', filters, dateColumn: 'created_at', semesterColumn: 'semester' }),
  },
  {
    id: 'dues_installments' as ExportDatasetId,
    label: 'Dues installments',
    sheetName: 'Dues_Installments',
    defaultSelected: true,
    dateColumn: 'created_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable({ table: 'dues_installments', filters, dateColumn: 'created_at', semesterColumn: 'semester' }),
  },
  {
    id: 'dues_late_fees' as ExportDatasetId,
    label: 'Dues late fees',
    sheetName: 'Dues_Late_Fees',
    defaultSelected: true,
    dateColumn: 'created_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable({ table: 'dues_late_fees', filters, dateColumn: 'created_at', semesterColumn: 'semester' }),
  },
  {
    id: 'dues_config' as ExportDatasetId,
    label: 'Dues config',
    sheetName: 'Dues_Config',
    defaultSelected: true,
    dateColumn: 'updated_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable({ table: 'dues_config', filters, dateColumn: 'updated_at', semesterColumn: 'semester' }),
  },
  {
    id: 'ticketed_events' as ExportDatasetId,
    label: 'Ticketed events',
    sheetName: 'Ticketed_Events',
    defaultSelected: false,
    dateColumn: 'starts_at',
    enabled: org.features.ticketing,
    fetchRows: (filters) => fetchAllFromTable({ table: 'ticketed_events', filters, dateColumn: 'starts_at' }),
  },
  {
    id: 'event_tickets' as ExportDatasetId,
    label: 'Event tickets',
    sheetName: 'Event_Tickets',
    defaultSelected: false,
    dateColumn: 'created_at',
    enabled: org.features.ticketing,
    fetchRows: (filters) => fetchAllFromTable({ table: 'event_tickets', filters, dateColumn: 'created_at' }),
  },
  {
    id: 'audit_logs' as ExportDatasetId,
    label: 'Audit logs',
    sheetName: 'Audit_Logs',
    defaultSelected: false,
    dateColumn: 'created_at',
    fetchRows: (filters) => fetchAllFromTable({ table: 'audit_logs', filters, dateColumn: 'created_at' }),
  },
] as ExportDataset[]).filter((d) => d.enabled !== false);

