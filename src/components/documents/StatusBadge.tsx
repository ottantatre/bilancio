import { Badge } from '@/components/ui/badge'
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '@/lib/constants'
import type { DocumentStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: DocumentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={DOCUMENT_STATUS_COLORS[status]}>
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  )
}
