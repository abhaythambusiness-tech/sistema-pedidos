import { Globe, Phone, Printer, Receipt, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { errorMessage, formatDateTime, formatMoney, NEXT_ACTION, timeAgo } from '@/lib/format'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'

type Filter = 'active' | 'delivered' | 'cancelled' | 'all'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'active', label: 'En curso' },
  { id: 'delivered', label: 'Entregados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'all', label: 'Todos' },
]
const isActive = (o: Order) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'

interface Props { orders: Order[] | null; fresh: Set<string>; onChanged: () => Promise<void> }

export function OrdersTab({ orders, fresh, onChanged }: Props) {
  const [filter, setFilter] = useState<Filter>('active')
  const [ticket, setTicket] = useState<{ id: string; text: string } | null>(null)
  const [cancelling, setCancelling] = useState<Order | null>(null)
  const [, setNow] = useState(0)
  useEffect(() => { const t = setInterval(() => setNow((n) => n + 1), 30_000); return () => clearInterval(t) }, [])

  if (!orders) return <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>

  const list = orders.filter((o) => (filter === 'all' ? true : filter === 'active' ? isActive(o) : o.status === filter))
  // En curso: el más antiguo primero (cocina atiende por orden de llegada).
  if (filter === 'active') list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) toast.success(ok); await onChanged() } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar pedidos">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={cn('min-h-10 rounded-full border px-4 text-sm font-bold transition-colors', filter === f.id ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:bg-muted')}>
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <p className="font-heading text-xl font-bold">{filter === 'active' ? 'Cocina al día' : 'Nada por aquí'}</p>
          <p className="text-muted-foreground">{filter === 'active' ? 'Los pedidos nuevos aparecerán solos.' : 'No hay pedidos con este filtro.'}</p>
        </div>
      )}

      <ul className="grid gap-3 lg:grid-cols-2">
        <AnimatePresence initial={false}>
          {list.map((o) => {
            const next = NEXT_ACTION[o.status]
            const Channel = o.source === 'voice' ? Phone : Globe
            return (
              <motion.li key={o.id} layout="position" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn('grid gap-3 rounded-2xl border bg-card p-4 transition-colors', fresh.has(o.id) ? 'border-primary ring-2 ring-primary/30' : 'border-border')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-heading text-lg font-bold"><span className="num">{o.id}</span><Channel className="size-4 text-muted-foreground" aria-label={o.source === 'voice' ? 'Llamada' : 'Web'} /></p>
                    <p className="text-sm text-muted-foreground"><span title={formatDateTime(o.createdAt)}>{timeAgo(o.createdAt)}</span> · {o.customerName}</p>
                  </div>
                  <div className="grid justify-items-end gap-1">
                    <StatusBadge status={o.status} />
                    <span className="num text-lg font-extrabold">{formatMoney(o.total)}</span>
                  </div>
                </div>

                <ul className="grid gap-1.5 border-y border-dashed border-border py-3">
                  {o.items.map((it, i) => (
                    <li key={i} className="text-sm">
                      <p className="flex justify-between gap-2 font-semibold"><span><span className="num">{it.quantity}×</span> {it.emoji} {it.name}</span><span className="num text-muted-foreground">{formatMoney(it.lineTotal)}</span></p>
                      {it.removed.length > 0 && <p className="text-primary">Sin {(it.removedNames?.length ? it.removedNames : it.removed).join(', ')}</p>}
                      {it.extras.length > 0 && <p className="text-leaf">+ {it.extras.map((e) => e.name).join(', ')}</p>}
                      {it.comments && <p className="text-muted-foreground">Nota: {it.comments}</p>}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-2">
                  {next && <Button onClick={() => run(() => api.admin.setStatus(o.id, next.to))}>{next.label}</Button>}
                  <Button variant="outline" size="icon" aria-label="Ver ticket" onClick={() => run(async () => setTicket({ id: o.id, text: await api.admin.ticket(o.id) }))}><Receipt aria-hidden /></Button>
                  <Button variant="outline" size="icon" aria-label="Reimprimir" onClick={() => run(async () => { const r = await api.admin.reprint(o.id); if (!r.print.ok) throw new Error('La impresora no responde') }, 'Ticket enviado a la impresora')}><Printer aria-hidden /></Button>
                  {(o.status === 'pending' || o.status === 'preparing' || o.status === 'ready') && (
                    <Button variant="ghost" className="ml-auto text-destructive" onClick={() => setCancelling(o)}><XCircle aria-hidden /> Cancelar</Button>
                  )}
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <Dialog open={!!ticket} onOpenChange={(o) => { if (!o) setTicket(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-xl font-bold">Ticket {ticket?.id}</DialogTitle><DialogDescription>Así sale por la impresora.</DialogDescription></DialogHeader>
          <pre className="max-h-[55dvh] overflow-auto rounded-lg border border-border bg-white p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-neutral-900">{ticket?.text}</pre>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(o) => { if (!o) setCancelling(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">¿Cancelar {cancelling?.id}?</DialogTitle>
            <DialogDescription>Se devuelve el stock de los ingredientes y el cliente verá el pedido como cancelado. No se puede reabrir.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>No, mantener</Button>
            <Button variant="destructive" onClick={() => { const o = cancelling; setCancelling(null); if (o) void run(() => api.admin.setStatus(o.id, 'cancelled'), 'Pedido cancelado y stock devuelto') }}>Sí, cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
