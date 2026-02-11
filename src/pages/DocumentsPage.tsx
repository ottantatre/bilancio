import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DocumentList } from '@/components/documents/DocumentList'
import { DocumentFilters } from '@/components/documents/DocumentFilters'
import { useDocuments } from '@/hooks/useDocuments'
import type { DocumentFilters as Filters } from '@/api/documents'

export function DocumentsPage() {
  const [filters, setFilters] = useState<Filters>({})
  const { data: documents, isLoading, error } = useDocuments(filters)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Button asChild>
          <Link to="/documents/new">New Document</Link>
        </Button>
      </div>

      <DocumentFilters filters={filters} onChange={setFilters} />

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">Error: {error.message}</p>}
      {documents && <DocumentList documents={documents} />}
    </div>
  )
}
