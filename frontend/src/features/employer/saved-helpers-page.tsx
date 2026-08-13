import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Heart, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { HelperCard } from '@/components/shared/helper-card'
import { EmptyState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { HelperSummary, PaginationMeta } from '@/lib/types'

interface SavedItem {
  id: number
  note: string | null
  list_id: number | null
  helper: HelperSummary
  created_at: string
}

interface List {
  id: number
  name: string
  saved_helpers_count: number
}

export function SavedHelpersPage() {
  const queryClient = useQueryClient()
  const [activeList, setActiveList] = useState<number | null>(null)
  const [newListName, setNewListName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['saved-helpers', activeList],
    queryFn: () => api.get<{ data: SavedItem[]; meta: PaginationMeta }>('/employers/saved-helpers', { list: activeList ?? undefined }),
  })

  const { data: lists } = useQuery({ queryKey: ['saved-lists'], queryFn: () => api.get<{ data: List[] }>('/employers/saved-helper-lists') })

  const removeMutation = useMutation({
    mutationFn: (uuid: string) => api.delete(`/employers/saved-helpers/${uuid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-helpers'] })
      queryClient.invalidateQueries({ queryKey: ['saved-lists'] })
      toast.success('Removed from saved helpers')
    },
  })

  const createList = useMutation({
    mutationFn: () => api.post('/employers/saved-helper-lists', { name: newListName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lists'] })
      setNewListName('')
      toast.success('List created')
    },
  })

  const deleteList = useMutation({
    mutationFn: (id: number) => api.delete(`/employers/saved-helper-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lists'] })
      queryClient.invalidateQueries({ queryKey: ['saved-helpers'] })
      toast.success('List deleted')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saved helpers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Shortlist helpers and organise them into lists.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline"><Plus /> New list</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a list</DialogTitle></DialogHeader>
            <div className="space-y-1.5">
              <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder='e.g. "Potential Nannies"' />
            </div>
            <DialogFooter>
              <Button disabled={newListName.length < 2 || createList.isPending} onClick={() => createList.mutate()}>
                Create list
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {lists && lists.data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button variant={activeList === null ? 'default' : 'outline'} size="sm" onClick={() => setActiveList(null)}>
            All saved
          </Button>
          {lists.data.map((l) => (
            <span key={l.id} className="inline-flex items-center gap-1">
              <Button variant={activeList === l.id ? 'default' : 'outline'} size="sm" onClick={() => setActiveList(l.id)}>
                {l.name} ({l.saved_helpers_count})
              </Button>
              <button className="cursor-pointer rounded p-1 text-muted-foreground hover:text-destructive" onClick={() => deleteList.mutate(l.id)} aria-label="Delete list">
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <EmptyState icon={Heart} title="No saved helpers yet" description="Save helpers from search results or their profile pages to build your shortlist." />
      ) : (
        <div className="space-y-4">
          {data?.data.map((item) => (
            <div key={item.id} className="relative">
              <HelperCard
                helper={item.helper}
                saved
                onSave={() => removeMutation.mutate(item.helper.uuid)}
              />
              {item.note && (
                <div className="absolute top-3 right-3 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
