import { AlertTriangle, CheckCircle2, Search, XOctagon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import type { Ingredient } from '@/lib/types'
import { cn } from '@/lib/utils'

const STEPS = [-10, -1, 1, 10]

function level(i: Ingredient) { return i.stock <= 0 ? 'out' : i.stock <= i.min_stock ? 'low' : 'ok' }

const PILL = {
  ok: { cls: 'outline' as const, Icon: CheckCircle2, text: 'Bien' },
  low: { cls: 'secondary' as const, Icon: AlertTriangle, text: 'Poco' },
  out: { cls: 'destructive' as const, Icon: XOctagon, text: 'Agotado' },
}

export function InventoryTab({ ingredients, onChanged }: { ingredients: Ingredient[] | null; onChanged: () => Promise<void> }) {
  const [q, setQ] = useState('')
  if (!ingredients) return <Skeleton className="h-80 rounded-2xl" />

  const rows = ingredients.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()))

  const adjust = async (i: Ingredient, delta: number) => {
    try { await api.admin.adjustStock(i.id, delta); await onChanged() } catch (e) { toast.error(errorMessage(e)) }
  }
  const threshold = async (i: Ingredient, raw: string) => {
    const v = Number(raw)
    if (raw === '' || !Number.isFinite(v) || v < 0 || v === i.min_stock) return
    try { await api.admin.setThreshold(i.id, v); toast.success(`Aviso de ${i.name.toLowerCase()} en ${v}`); await onChanged() } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="grid gap-3">
      <InputGroup className="max-w-xs">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ingrediente" aria-label="Buscar ingrediente" />
      </InputGroup>
      <Card className="overflow-x-auto py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingrediente</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Ajustar</TableHead>
              <TableHead className="w-28">Avisar en</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => {
              const l = level(i)
              const { cls, Icon, text } = PILL[l]
              return (
                <TableRow key={i.id} className={cn(l !== 'ok' && 'bg-secondary/20')}>
                  <TableCell className="font-semibold whitespace-nowrap">{i.emoji} {i.name}</TableCell>
                  <TableCell>
                    <Badge variant={cls} className="num h-7 gap-1.5 px-2.5 text-sm">
                      <Icon data-icon="inline-start" /> {i.stock} {i.unit} <span className="sr-only">({text})</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ToggleGroup value={[]} variant="outline" size="sm" aria-label={`Ajustar ${i.name}`}>
                      {STEPS.map((s) => (
                        <ToggleGroupItem key={s} value={String(s)} className="num min-w-11" onClick={() => adjust(i, s)} disabled={s < 0 && i.stock <= 0}>{s > 0 ? `+${s}` : s}</ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </TableCell>
                  <TableCell>
                    <Input type="number" inputMode="decimal" min={0} defaultValue={i.min_stock} key={`${i.id}-${i.min_stock}`} aria-label={`Aviso de ${i.name}`}
                      onBlur={(e) => threshold(i, e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} className="num h-9 w-20" />
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={4}><Empty><EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>Ningún ingrediente coincide</EmptyTitle></EmptyHeader></Empty></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
