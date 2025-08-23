import { useState } from 'react';
import { createDocumentMock } from '@/api/cashflow.mock';

export function NewDocumentPage() {
  const [form, setForm] = useState({
    kind: 'ap_invoice',
    direction: 'OUT' as const,
    number: '',
    title: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    amount_gross: 0,
    currency: 'PLN',
  });

  async function save() {
    await createDocumentMock({
      kind: form.kind,
      direction: form.direction,
      title: form.title || form.number || form.kind,
      amount_gross: form.amount_gross,
      due_date: form.due_date,
      currency: form.currency,
    });
    alert('Zapisano (mock)');
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-semibold">Nowy dokument</h1>
      <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} className="border p-2 rounded w-full">
        <option value="ap_invoice">Faktura zakupu</option>
        <option value="ar_invoice">Faktura sprzedaży</option>
        <option value="tax">Podatek</option>
        <option value="standing_order">Zlecenie stałe</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="border p-2 rounded w-full"
          placeholder="Numer"
          value={form.number}
          onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Tytuł"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={form.issue_date}
          onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
        />
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={form.due_date}
          onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
        />
      </div>
      <input
        type="number"
        className="border p-2 rounded w-full"
        placeholder="Kwota brutto"
        value={form.amount_gross}
        onChange={(e) => setForm((f) => ({ ...f, amount_gross: Number(e.target.value) }))}
      />
      <div className="text-sm opacity-70">Waluta: {form.currency}</div>
      <button onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white">
        Zapisz
      </button>
    </div>
  );
}
