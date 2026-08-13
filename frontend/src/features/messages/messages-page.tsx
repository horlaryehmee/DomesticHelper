import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/states'
import { api, ApiError } from '@/lib/api'
import { formatRelative } from '@/lib/format'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Conversation {
  uuid: string
  other_user: { uuid: string; name: string; photo_url: string | null }
  job: { uuid: string; title: string } | null
  last_message: { body: string; sender_id: number; created_at: string } | null
  unread_count?: number
  blocked_by: number | null
  last_message_at: string | null
}

interface Message {
  uuid: string
  body: string
  sender_id: number
  read_at: string | null
  created_at: string
}

export function MessagesPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()
  const activeUuid = params.get('conversation')
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: convos } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<{ data: Conversation[] }>('/conversations'),
  })

  const { data: thread, refetch: refetchThread } = useQuery({
    queryKey: ['conversation', activeUuid],
    queryFn: () => api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${activeUuid}`),
    enabled: !!activeUuid,
  })

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post(`/conversations/${activeUuid}/messages`, { body }),
    onSuccess: () => {
      setDraft('')
      refetchThread()
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not send'),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages.length])

  const conversations = convos?.data ?? []
  const active = conversations.find((c) => c.uuid === activeUuid)
  const blockedByOther = active?.blocked_by != null && active.blocked_by !== user?.id

  return (
    <div className="grid h-[calc(100vh-140px)] gap-4 md:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <Card className="overflow-hidden gap-0">
        <div className="border-b px-4 py-3 font-semibold">Messages</div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.uuid}
              onClick={() => setParams({ conversation: c.uuid })}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent',
                c.uuid === activeUuid && 'bg-accent',
              )}
            >
              <Avatar className="size-10">
                <AvatarImage src={c.other_user.photo_url ?? undefined} />
                <AvatarFallback name={c.other_user.name}>{c.other_user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">{c.other_user.name}</span>
                  {c.last_message && <span className="text-[10px] text-muted-foreground">{formatRelative(c.last_message.created_at)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">{c.last_message?.body ?? 'Start a conversation'}</span>
                  {(c.unread_count ?? 0) > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Thread */}
      <Card className="flex min-h-0 flex-col gap-0 overflow-hidden">
        {!activeUuid ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={MessageSquare} title="Select a conversation" description="Choose a conversation from the list to start chatting." />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Avatar className="size-8">
                <AvatarImage src={active?.other_user.photo_url ?? undefined} />
                <AvatarFallback name={active?.other_user.name}>{active?.other_user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium">{active?.other_user.name}</div>
                {active?.job && <div className="truncate text-xs text-muted-foreground">Re: {active.job.title}</div>}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
              {thread?.messages.map((m) => {
                const mine = m.sender_id === user?.id
                return (
                  <div key={m.uuid} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                        mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-card',
                      )}
                    >
                      {m.body}
                      <div className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {formatRelative(m.created_at)} {mine && m.read_at && '· read'}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {blockedByOther ? (
              <div className="border-t p-4 text-center text-sm text-muted-foreground">This conversation has been blocked by the other user.</div>
            ) : (
              <form
                className="flex gap-2 border-t p-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (draft.trim()) sendMutation.mutate(draft.trim())
                }}
              >
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" disabled={sendMutation.isPending} />
                <Button type="submit" size="icon" disabled={!draft.trim() || sendMutation.isPending}>
                  <Send />
                </Button>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
