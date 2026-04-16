/** Minimal ICS parse for PWA “open .ics” previews (first VEVENT only). */

export type IcsPreview = {
  summary?: string;
  /** Raw DTSTART value (e.g. 20250415T180000Z or TZID form). */
  startRaw?: string;
};

export function parseFirstVeventPreview(ics: string): IcsPreview | null {
  const vevent = ics.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/i);
  if (!vevent) return null;
  const block = vevent[1] ?? '';
  const summaryLine = block.match(/SUMMARY[^:]*:([^\r\n]+)/i)?.[1];
  const summary = summaryLine?.replace(/\\([,;\\])/g, '$1').replace(/\\n/g, '\n');
  const startRaw =
    block.match(/DTSTART[^:]*:([^\r\n]+)/i)?.[1] ?? block.match(/DTSTART;[^\r\n]+\r?\n[ \t]+([^\r\n]+)/i)?.[1];
  return { summary: summary?.trim(), startRaw: startRaw?.trim() };
}
