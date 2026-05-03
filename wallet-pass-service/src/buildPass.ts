import { PKPass } from 'passkit-generator';
import { defaultPassImages } from './icons.js';

export interface TicketPassInput {
  ticketId: string;
  checkInCode: string;
  eventTitle: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  attendeeName: string | null;
}

export interface SigningMaterial {
  wwdr: Buffer;
  signerCert: Buffer;
  signerKey: Buffer;
  signerKeyPassphrase?: string;
}

export interface PassBrand {
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName: string;
}

export function buildBrotherhoodTicketPass(
  data: TicketPassInput,
  certs: SigningMaterial,
  brand: PassBrand
): Buffer {
  const startDate = new Date(data.startsAt);
  const endDate = data.endsAt ? new Date(data.endsAt) : null;

  const secondaryLines: { key: string; label: string; value: string }[] = [
    {
      key: 'starts',
      label: 'Starts',
      value: formatDateTime(startDate),
    },
  ];
  if (endDate && !Number.isNaN(endDate.getTime())) {
    secondaryLines.push({
      key: 'ends',
      label: 'Ends',
      value: formatDateTime(endDate),
    });
  }
  secondaryLines.push({
    key: 'where',
    label: 'Location',
    value: data.location?.trim() || '—',
  });

  const pass = new PKPass(
    {},
    {
      wwdr: certs.wwdr,
      signerCert: certs.signerCert,
      signerKey: certs.signerKey,
      ...(certs.signerKeyPassphrase ? { signerKeyPassphrase: certs.signerKeyPassphrase } : {}),
    },
    {
      description: `Brotherhood ticket — ${data.eventTitle}`,
      passTypeIdentifier: brand.passTypeIdentifier,
      teamIdentifier: brand.teamIdentifier,
      serialNumber: data.ticketId,
      organizationName: brand.organizationName,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(67, 56, 202)',
      labelColor: 'rgb(226, 232, 240)',
      logoText: data.eventTitle.length > 18 ? `${data.eventTitle.slice(0, 17)}…` : data.eventTitle,
    }
  );

  pass.type = 'eventTicket';

  pass.primaryFields.push({
    key: 'event',
    label: 'Event',
    value: data.eventTitle,
  });

  for (const f of secondaryLines) {
    pass.secondaryFields.push(f);
  }

  if (data.attendeeName) {
    pass.auxiliaryFields.push({
      key: 'guest',
      label: 'Guest',
      value: data.attendeeName,
    });
  }

  pass.setBarcodes({
    message: data.checkInCode,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: data.checkInCode,
  });

  pass.setRelevantDates([{ relevantDate: startDate }]);

  const images = defaultPassImages();
  for (const [name, buf] of Object.entries(images)) {
    pass.addBuffer(name, buf);
  }

  return pass.getAsBuffer();
}


function formatDateTime(d: Date): string {
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return `${d.toLocaleDateString('en-US', { dateStyle: 'medium' })} ${d.toLocaleTimeString('en-US', { timeStyle: 'short' })}`;
  } catch {
    return d.toISOString();
  }
}
