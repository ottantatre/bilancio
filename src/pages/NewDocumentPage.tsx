import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentForm } from '@/components/documents/DocumentForm'
import { useCreateDocument } from '@/hooks/useDocumentMutation'
import type { DocumentInsert } from '@/lib/types'

export function NewDocumentPage() {
  const navigate = useNavigate()
  const { mutate, isPending } = useCreateDocument()

  function handleSubmit(data: DocumentInsert) {
    mutate(data, {
      onSuccess: () => navigate('/documents'),
    })
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New Document</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentForm onSubmit={handleSubmit} submitting={isPending} />
        </CardContent>
      </Card>
    </div>
  )
}
