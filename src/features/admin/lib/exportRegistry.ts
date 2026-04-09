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

async function fetchAllFromTable<T extends Record<string, unknown>>(opts: {
  table: Parameters<typeof supabase.from>[0];
  select?: string;
  dateColumn?: string;
  semesterColumn?: string;
  filters: ExportFilters;
  pageSize?: number;
}): Promise<Record<string, unknown>[]> {
  const { table, select = '*', filters, dateColumn, semesterColumn, pageSize = 1000 } = opts;

  const all: T[] = [];
  let offset = 0;

  // Convert date-only input to full-day inclusive window.
  const fromISO = filters.fromDate ? `${filters.fromDate}T00:00:00.000Z` : undefined;
  const toISO = filters.toDate ? `${filters.toDate}T23:59:59.999Z` : undefined;

  while (true) {
    type QueryChain = {
      range: (from: number, to: number) => unknown;
      gte: (col: string, val: string) => unknown;
      lte: (col: string, val: string) => unknown;
      eq: (col: string, val: string) => unknown;
    };
    type QueryResult<R> = { data: R[] | null; error: unknown };
    type QueryPromise<R> = Promise<QueryResult<R>>;

    let q = supabase.from(table).select(select) as unknown as QueryChain;
    let qAny = q.range(offset, offset + pageSize - 1) as unknown as QueryChain;

    if (dateColumn && fromISO) qAny = qAny.gte(dateColumn, fromISO) as unknown as QueryChain;
    if (dateColumn && toISO) qAny = qAny.lte(dateColumn, toISO) as unknown as QueryChain;
    if (semesterColumn && filters.semester) qAny = qAny.eq(semesterColumn, filters.semester) as unknown as QueryChain;

    const { data, error } = await (qAny as unknown as QueryPromise<T>);
    if (error) throw error;

    const rows = (data ?? []) as T[];
    all.push(...rows);

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return normalizeRows(all);
}

export const exportDatasets: ExportDataset[] = [
  {
    id: 'profiles',
    label: 'Members (profiles)',
    sheetName: 'Members',
    defaultSelected: true,
    dateColumn: 'updated_at',
    fetchRows: (filters) => fetchAllFromTable<Tables<'profiles'>>({ table: 'profiles', filters, dateColumn: 'updated_at' }),
  },
  {
    id: 'events',
    label: 'Events',
    sheetName: 'Events',
    defaultSelected: true,
    dateColumn: 'start_time',
    fetchRows: (filters) => fetchAllFromTable<Tables<'events'>>({ table: 'events', filters, dateColumn: 'start_time' }),
  },
  {
    id: 'event_rsvps',
    label: 'Event RSVPs',
    sheetName: 'Event_RSVPs',
    defaultSelected: true,
    dateColumn: 'updated_at',
    fetchRows: (filters) => fetchAllFromTable<Tables<'event_rsvps'>>({ table: 'event_rsvps', filters, dateColumn: 'updated_at' }),
  },
  {
    id: 'attendance',
    label: 'Attendance records',
    sheetName: 'Attendance',
    defaultSelected: true,
    dateColumn: 'checked_in_at',
    fetchRows: (filters) => fetchAllFromTable<Tables<'attendance'>>({ table: 'attendance', filters, dateColumn: 'checked_in_at' }),
  },
  {
    id: 'service_hours',
    label: 'Service hours',
    sheetName: 'Service_Hours',
    defaultSelected: true,
    dateColumn: 'service_date',
    fetchRows: (filters) => fetchAllFromTable<Tables<'service_hours'>>({ table: 'service_hours', filters, dateColumn: 'service_date' }),
  },
  {
    id: 'points_ledger',
    label: 'Points ledger',
    sheetName: 'Points_Ledger',
    defaultSelected: true,
    dateColumn: 'created_at',
    fetchRows: (filters) => fetchAllFromTable<Tables<'points_ledger'>>({ table: 'points_ledger', filters, dateColumn: 'created_at' }),
  },
  {
    id: 'dues_payments',
    label: 'Dues payments',
    sheetName: 'Dues_Payments',
    defaultSelected: true,
    dateColumn: 'paid_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable<Tables<'dues_payments'>>({ table: 'dues_payments', filters, dateColumn: 'paid_at', semesterColumn: 'semester' }),
  },
  {
    id: 'dues_line_items',
    label: 'Dues line items',
    sheetName: 'Dues_Line_Items',
    defaultSelected: true,
    dateColumn: 'created_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable<Tables<'dues_line_items'>>({ table: 'dues_line_items', filters, dateColumn: 'created_at', semesterColumn: 'semester' }),
  },
  {
    id: 'dues_installments',
    label: 'Dues installments',
    sheetName: 'Dues_Installments',
    defaultSelected: true,
    dateColumn: 'created_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable<Tables<'dues_installments'>>({ table: 'dues_installments', filters, dateColumn: 'created_at', semesterColumn: 'semester' }),
  },
  {
    id: 'dues_late_fees',
    label: 'Dues late fees',
    sheetName: 'Dues_Late_Fees',
    defaultSelected: true,
    dateColumn: 'created_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable<Tables<'dues_late_fees'>>({ table: 'dues_late_fees', filters, dateColumn: 'created_at', semesterColumn: 'semester' }),
  },
  {
    id: 'dues_config',
    label: 'Dues config',
    sheetName: 'Dues_Config',
    defaultSelected: true,
    dateColumn: 'updated_at',
    semesterColumn: 'semester',
    enabled: org.features.dues,
    fetchRows: (filters) => fetchAllFromTable<Tables<'dues_config'>>({ table: 'dues_config', filters, dateColumn: 'updated_at', semesterColumn: 'semester' }),
  },
  {
    id: 'ticketed_events',
    label: 'Ticketed events',
    sheetName: 'Ticketed_Events',
    defaultSelected: false,
    dateColumn: 'starts_at',
    enabled: org.features.ticketing,
    fetchRows: (filters) => fetchAllFromTable<Tables<'ticketed_events'>>({ table: 'ticketed_events', filters, dateColumn: 'starts_at' }),
  },
  {
    id: 'event_tickets',
    label: 'Event tickets',
    sheetName: 'Event_Tickets',
    defaultSelected: false,
    dateColumn: 'created_at',
    enabled: org.features.ticketing,
    fetchRows: (filters) => fetchAllFromTable<Tables<'event_tickets'>>({ table: 'event_tickets', filters, dateColumn: 'created_at' }),
  },
  {
    id: 'audit_logs',
    label: 'Audit logs',
    sheetName: 'Audit_Logs',
    defaultSelected: false,
    dateColumn: 'created_at',
    fetchRows: (filters) => fetchAllFromTable<Tables<'audit_logs'>>({ table: 'audit_logs', filters, dateColumn: 'created_at' }),
  },
].filter((d) => d.enabled !== false);

