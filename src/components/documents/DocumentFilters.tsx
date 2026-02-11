import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DOCUMENT_KIND_LABELS, DOCUMENT_STATUS_LABELS, DIRECTION_LABELS } from '@/lib/constants'
import type { DocumentFilters as Filters } from '@/api/documents'

interface DocumentFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function DocumentFilters({ filters, onChange }: DocumentFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search..."
        value={filters.search ?? ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        className="w-48"
      />
      <Select
        value={filters.kind ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, kind: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Document Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {Object.entries(DOCUMENT_KIND_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, status: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.direction ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, direction: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {Object.entries(DIRECTION_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
