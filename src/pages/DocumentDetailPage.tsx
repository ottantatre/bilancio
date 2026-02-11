import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/documents/StatusBadge'
import { DocumentForm } from '@/components/documents/DocumentForm'
import { useDocument } from '@/hooks/useDocument'
import { useUpdateDocument, useDeleteDocument } from '@/hooks/useDocumentMutation'
import { fetchPayments, createPayment, deletePayment } from '@/api/payments'
import { DOCUMENT_KIND_LABELS, DIRECTION_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { DocumentInsert, PaymentMethod } from '@/lib/types'

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: doc, isLoading, error } = useDocument(id!)
  const { mutate: update, isPending: updating } = useUpdateDocument()
  const { mutate: remove, isPending: deleting } = useDeleteDocument()
  const [editing, setEditing] = useState(false)

  const { data: payments } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => fetchPayments(id!),
    enabled: !!id,
  })

  const addPayment = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] })
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })

  const removePayment = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] })
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>
  if (error) return <p className="text-destructive">Error: {error.message}</p>
  if (!doc) return <p className="text-destructive">Document not found.</p>

  function handleUpdate(data: DocumentInsert) {
    update(
      { id: id!, ...data },
      { onSuccess: () => setEditing(false) },
    )
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this document?')) return
    remove(id!, { onSuccess: () => navigate('/documents') })
  }

  function handleAddPayment() {
    if (!paymentAmount || !paymentDate) return
    addPayment.mutate({
      document_id: id!,
      paid_date: paymentDate,
      amount: parseFloat(paymentAmount),
      method: paymentMethod,
    })
    setPaymentAmount('')
  }

  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  if (editing) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Document</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentForm initial={doc} onSubmit={handleUpdate} submitting={updating} />
            <Button variant="ghost" className="mt-2" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{doc.title}</CardTitle>
              {doc.number && (
                <p className="mt-1 text-sm text-muted-foreground">{doc.number}</p>
              )}
            </div>
            <StatusBadge status={doc.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>{' '}
              {DOCUMENT_KIND_LABELS[doc.kind]}
            </div>
            <div>
              <span className="text-muted-foreground">Direction:</span>{' '}
              {DIRECTION_LABELS[doc.direction]}
            </div>
            <div>
              <span className="text-muted-foreground">Issue Date:</span>{' '}
              {formatDate(doc.issue_date)}
            </div>
            <div>
              <span className="text-muted-foreground">Due Date:</span>{' '}
              {formatDate(doc.due_date)}
            </div>
            {doc.counterparty && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Counterparty:</span> {doc.counterparty}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Net:</span>{' '}
              {doc.amount_net != null ? formatCurrency(doc.amount_net, doc.currency) : '—'}
            </div>
            <div>
              <span className="text-muted-foreground">Gross:</span>{' '}
              <span className="font-medium">
                {formatCurrency(doc.amount_gross, doc.currency)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Paid:</span>{' '}
              {formatCurrency(totalPaid, doc.currency)}
            </div>
            <div>
              <span className="text-muted-foreground">Remaining:</span>{' '}
              <span className="font-medium">
                {formatCurrency(doc.amount_gross - totalPaid, doc.currency)}
              </span>
            </div>
          </div>
          {doc.notes && (
            <p className="text-sm text-muted-foreground">{doc.notes}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {payments && payments.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paid_date)}</TableCell>
                    <TableCell>{formatCurrency(p.amount, doc.currency)}</TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePayment.mutate(p.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Separator />

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label>Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddPayment}
              disabled={addPayment.isPending || !paymentAmount}
            >
              Add Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
