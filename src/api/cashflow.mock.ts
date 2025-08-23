import type { CashflowEvent } from '@/lib/types';
import dayjs from 'dayjs';

let mockData: CashflowEvent[] = [
  {
    event_date: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    title: 'FV/1/2025 — Usługi IT',
    direction: 'IN',
    kind: 'ar_invoice',
    status: 'issued',
    amount: 10000,
    currency: 'PLN',
    document_id: null,
    source: 'mock',
  },
  {
    event_date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    title: 'FV/2/2025 — Leasing',
    direction: 'OUT',
    kind: 'ap_invoice',
    status: 'issued',
    amount: 3000,
    currency: 'PLN',
    document_id: null,
    source: 'mock',
  },
];

export async function fetchCashflow(_: string, __ = 90): Promise<CashflowEvent[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockData;
}

export async function materializeRecurring(_: string, __ = 90): Promise<number> {
  await new Promise((r) => setTimeout(r, 200));
  mockData = [
    ...mockData,
    {
      event_date: dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'),
      title: 'Abonament SaaS',
      direction: 'OUT',
      kind: 'standing_order',
      status: 'planned',
      amount: 199,
      currency: 'PLN',
      document_id: null,
      source: 'mock',
    },
  ];
  return 1;
}

export async function createDocumentMock(e: {
  kind: string;
  direction: 'IN' | 'OUT';
  title: string;
  amount_gross: number;
  due_date: string;
  currency?: string;
}) {
  mockData = [
    ...mockData,
    {
      event_date: e.due_date,
      title: e.title || e.kind,
      direction: e.direction,
      kind: e.kind as any,
      status: 'issued',
      amount: e.amount_gross,
      currency: e.currency ?? 'PLN',
      document_id: null,
      source: 'mock',
    },
  ];
}
