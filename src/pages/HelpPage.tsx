import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  { q: 'How do I check in to an event?', a: 'When attendance is open, scan the QR code or check in manually through the Events page.' },
  { q: 'How are points calculated?', a: 'Points are awarded based on event attendance. Each event has a point value based on its category.' },
  { q: 'How do I log a coffee chat?', a: 'Go to Coffee Chats, select the member you met with, and submit your meeting details.' },
];

export default function HelpPage() {
  return (
    <AppLayout>
      <PageHeader title="Help" description="Frequently asked questions" />
      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
