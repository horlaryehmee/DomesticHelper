import { useRef, useState, type UIEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Plus, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CommunityStoryDialog } from './community-story-dialog'

interface CommunityExperience {
  uuid: string
  content_type: 'experience' | 'video'
  title: string
  description: string
  category: string
  subject_name: string | null
  location: string | null
  incident_date: string | null
  source_url: string | null
  media_url: string | null
  poster_url: string | null
  slides: { id: number; url: string; mime_type: string }[]
  verification_level: 'submitted' | 'source_linked' | 'evidence_reviewed'
  published_at: string
}

function instagramEmbedUrl(url: string | null) {
  const match = url?.match(/instagram\.com\/(reel|p)\/([^/?#]+)/i)
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : null
}

export function CommunityExperiencesPage() {
  const [type, setType] = useState('all')
  const { data, isLoading } = useQuery({
    queryKey: ['community-experiences', type],
    queryFn: () => api.get<{ data: CommunityExperience[] }>('/community-experiences', { type: type === 'all' ? undefined : type }),
  })
  const visibleItems = data?.data ?? []

  return (
    <div className="min-h-screen bg-muted/30">
      <section className="sticky top-16 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-3 py-3 sm:px-0">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">Community Stories</h1>
            <p className="text-xs text-muted-foreground">Reviewed experiences and sourced media</p>
          </div>
          <CommunityStoryDialog trigger={<Button size="sm"><Plus /> Share</Button>} />
        </div>
      </section>

      <section className="mx-auto max-w-xl px-0 py-3 sm:px-0 sm:py-5">
        <div className="mx-3 mb-3 rounded-xl border bg-background p-3 sm:mx-0">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="size-4" /></span>
            <p className="text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Moderated for safety.</strong> Stories describe contributors’ experiences. Source-linked means the original media is identified, not that every claim is proven.</p>
          </div>
          <div className="mt-3 flex gap-2 border-t pt-3">
            {[['all','All'],['experience','Stories'],['video','Videos']].map(([value,label]) => <Button key={value} size="sm" className="h-8 flex-1" variant={type===value?'default':'ghost'} onClick={()=>setType(value)}>{label}</Button>)}
          </div>
        </div>
        {isLoading ? <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-[520px] rounded-none sm:rounded-xl" />)}</div> : (
          <div className="space-y-3">
            {visibleItems.map((item) => {
              if (item.slides?.length) return <SlideCarousel key={item.uuid} item={item} />
              if (item.content_type === 'video' && item.media_url) return <div key={item.uuid} className="mx-auto w-full max-w-[405px] overflow-hidden bg-background sm:rounded-xl sm:border">
                <video src={item.media_url} poster={item.poster_url ?? undefined} title={item.title} className="block max-h-[78vh] w-full bg-black object-contain" controls playsInline preload="none" />
                {item.source_url && <div className="flex justify-end px-3 py-2"><Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs"><a href={item.source_url} target="_blank" rel="noopener noreferrer">View source <ExternalLink /></a></Button></div>}
              </div>
              const instagramEmbed = instagramEmbedUrl(item.source_url)
              if (instagramEmbed) return <div key={item.uuid} className="mx-auto w-full max-w-[405px] overflow-hidden bg-background sm:rounded-xl sm:border">
                <div className="aspect-[4/5] overflow-hidden bg-black"><iframe src={instagramEmbed} title={item.title} scrolling="no" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" className="h-full w-full border-0" /></div>
                <div className="flex justify-end px-3 py-2"><Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs"><a href={item.source_url!} target="_blank" rel="noopener noreferrer">View source <ExternalLink /></a></Button></div>
              </div>
              return <Card key={item.uuid} className="mx-3 gap-0 py-0 sm:mx-0"><CardContent className="px-4 py-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive"/><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{item.content_type === 'video' ? 'The Instagram source is approved. Its slide images are awaiting upload.' : item.description}</p>{item.source_url&&<a href={item.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">View source <ExternalLink className="size-3"/></a>}</div></div></CardContent></Card>
            })}
            {!visibleItems.length && <p className="mx-3 rounded-lg border border-dashed bg-background py-14 text-center text-sm text-muted-foreground sm:mx-0">No approved entries in this category yet.</p>}
          </div>
        )}
      </section>
    </div>
  )
}

function SlideCarousel({ item }: { item: CommunityExperience }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const move = (index: number) => {
    const next = Math.max(0, Math.min(item.slides.length - 1, index))
    track.current?.scrollTo({ left: next * track.current.clientWidth, behavior: 'smooth' })
    setActive(next)
  }
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const width = event.currentTarget.clientWidth
    if (width) setActive(Math.round(event.currentTarget.scrollLeft / width))
  }

  return <div className="mx-auto w-full max-w-[405px] overflow-hidden bg-background sm:rounded-xl sm:border">
    <div className="relative bg-black">
      <div ref={track} onScroll={onScroll} className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {item.slides.map((slide, index) => <img key={slide.id} src={slide.url} alt={`${item.title}, slide ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} className="h-full w-full shrink-0 snap-center object-contain" />)}
      </div>
      {active > 0 && <button type="button" onClick={() => move(active - 1)} aria-label="Previous slide" className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white"><ChevronLeft className="size-5" /></button>}
      {active < item.slides.length - 1 && <button type="button" onClick={() => move(active + 1)} aria-label="Next slide" className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white"><ChevronRight className="size-5" /></button>}
      <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">{active + 1}/{item.slides.length}</span>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">{item.slides.map((slide, index) => <button key={slide.id} type="button" onClick={() => move(index)} aria-label={`Go to slide ${index + 1}`} className={`size-1.5 rounded-full ${active === index ? 'bg-white' : 'bg-white/45'}`} />)}</div>
    </div>
    {item.source_url && <div className="flex justify-end px-3 py-2"><Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs"><a href={item.source_url} target="_blank" rel="noopener noreferrer">View source <ExternalLink /></a></Button></div>}
  </div>
}
