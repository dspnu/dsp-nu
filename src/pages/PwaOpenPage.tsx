import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  clearIncomingFilePayloads,
  readIncomingFilePayloads,
  type PwaIncomingFilePayload,
} from '@/lib/pwaIncomingStorage';
import { parseFirstVeventPreview } from '@/lib/icsPreview';
import { org } from '@/config/org';

function CsvPreview({ text }: { text: string }) {
  const preview = useMemo(() => {
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      preview: 8,
    });
    return result.data ?? [];
  }, [text]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const r of preview) {
      Object.keys(r).forEach(k => keys.add(k));
    }
    return [...keys].slice(0, 8);
  }, [preview]);

  if (preview.length === 0) {
    return <p className="text-sm text-muted-foreground">Could not parse CSV preview.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map(c => (
              <th key={c} className="px-2 py-1.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, i) => (
            <tr key={i} className="border-b border-muted last:border-0">
              {columns.map(c => (
                <td key={c} className="px-2 py-1.5">
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PwaOpenPage() {
  const navigate = useNavigate();
  const [payloads, setPayloads] = useState<PwaIncomingFilePayload[] | null>(() => readIncomingFilePayloads());
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setPayloads(readIncomingFilePayloads());
  }, []);

  useEffect(() => {
    reload();
  }, [reload, tick]);

  useEffect(() => {
    const onIncoming = () => setTick(t => t + 1);
    window.addEventListener('pwa-incoming-files', onIncoming);
    return () => window.removeEventListener('pwa-incoming-files', onIncoming);
  }, []);

  useEffect(() => {
    return () => {
      if (!payloads) return;
      for (const p of payloads) {
        if (p.objectUrl) {
          URL.revokeObjectURL(p.objectUrl);
        }
      }
    };
  }, [payloads]);

  const first = payloads?.[0];

  const icsPreview = useMemo(() => {
    if (first?.kind !== 'ics' || !first.text) return null;
    return parseFirstVeventPreview(first.text);
  }, [first]);

  const dismiss = () => {
    clearIncomingFilePayloads();
    setPayloads(null);
    navigate('/');
  };

  const goEventsWithIcs = () => {
    const text = first?.kind === 'ics' ? first.text : undefined;
    clearIncomingFilePayloads();
    setPayloads(null);
    if (text) {
      navigate('/events', { state: { pendingIcsText: text } });
    } else {
      navigate('/events');
    }
  };

  const openPdf = () => {
    if (first?.kind === 'pdf' && first.objectUrl) {
      window.open(first.objectUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Opened file" className="mb-3 md:mb-4" />

      {!first ? (
        <Card>
          <CardHeader>
            <CardTitle>No file pending</CardTitle>
            <CardDescription>
              When you open a supported file type with the installed {org.shortName} app, details appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="secondary" onClick={() => navigate('/')}>
              Back to home
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{first.name}</CardTitle>
              <CardDescription>
                {first.kind === 'ics' && 'Calendar file — preview the first event or jump to Events.'}
                {first.kind === 'csv' && 'Spreadsheet — preview rows and use importers from Alumni, EOP, or other tools where needed.'}
                {first.kind === 'pdf' && 'PDF — open in a new tab to read.'}
                {first.kind === 'unknown' && 'Unsupported type for in-app preview.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {first.kind === 'ics' && first.text && (
                <div className="space-y-2 text-sm">
                  {icsPreview?.summary && (
                    <p>
                      <span className="font-medium">First event:</span> {icsPreview.summary}
                    </p>
                  )}
                  {icsPreview?.startRaw && (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Starts:</span> {icsPreview.startRaw}
                    </p>
                  )}
                  {!icsPreview && <p className="text-muted-foreground">No VEVENT block found in this file.</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" onClick={goEventsWithIcs}>
                      Continue to Events
                    </Button>
                    <Button type="button" variant="outline" onClick={dismiss}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {first.kind === 'csv' && first.text && (
                <div className="space-y-3">
                  <CsvPreview text={first.text} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate('/people')}>
                      Members directory
                    </Button>
                    <Button type="button" variant="outline" onClick={dismiss}>
                      Dismiss
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Import flows (Alumni, EOP, Coffee Chats, etc.) live under their sections in the app — use those
                    screens to upload this file where supported.
                  </p>
                </div>
              )}

              {first.kind === 'pdf' && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={openPdf}>
                    Open PDF
                  </Button>
                  <Button type="button" variant="outline" onClick={dismiss}>
                    Dismiss
                  </Button>
                </div>
              )}

              {first.kind === 'unknown' && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={dismiss}>
                    Dismiss
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
