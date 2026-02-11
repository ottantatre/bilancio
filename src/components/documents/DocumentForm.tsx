import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DOCUMENT_KIND_LABELS, DOCUMENT_STATUS_LABELS, DIRECTION_LABELS } from '@/lib/constants'
import type { DocumentInsert, Document, DocumentKind, Direction, DocumentStatus } from '@/lib/types'

interface DocumentFormProps {
  initial?: Document
  onSubmit: (data: DocumentInsert) => void
  submitting?: boolean
}

export function DocumentForm({ initial, onSubmit, submitting }: DocumentFormProps) {
  const [kind, setKind] = useState<DocumentKind>(initial?.kind ?? 'ap_invoice')
  const [direction, setDirection] = useState<Direction>(initial?.direction ?? 'OUT')
  const [status, setStatus] = useState<DocumentStatus>(initial?.status ?? 'planned')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [number, setNumber] = useState(initial?.number ?? '')
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? '')
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? '')
  const [dueDate, setDueDate] = useState(
    initial?.due_date ?? new Date().toISOString().slice(0, 10),
  )
  const [amountNet, setAmountNet] = useState(initial?.amount_net?.toString() ?? '')
  const [amountGross, setAmountGross] = useState(initial?.amount_gross?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? 'PLN')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      kind,
      direction,
      status,
      title,
      number: number || undefined,
      counterparty: counterparty || undefined,
      issue_date: issueDate || undefined,
      due_date: dueDate,
      amount_net: amountNet ? parseFloat(amountNet) : undefined,
      amount_gross: parseFloat(amountGross),
      currency,
      notes: notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Document Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as DocumentKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_KIND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIRECTION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as DocumentStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="number">Number</Label>
          <Input
            id="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. INV/1/2025"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="counterparty">Counterparty</Label>
        <Input
          id="counterparty"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="issue_date">Issue Date</Label>
          <Input
            id="issue_date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="amount_net">Net Amount</Label>
          <Input
            id="amount_net"
            type="number"
            step="0.01"
            value={amountNet}
            onChange={(e) => setAmountNet(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount_gross">Gross Amount</Label>
          <Input
            id="amount_gross"
            type="number"
            step="0.01"
            value={amountGross}
            onChange={(e) => setAmountGross(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : initial ? 'Update' : 'Create Document'}
      </Button>
    </form>
  )
}
