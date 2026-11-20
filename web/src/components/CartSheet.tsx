import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { errorMessage, formatMoney } from '@/lib/format'
import { LAST_ORDER_KEY } from '@/pages/Tracking'

interface Props { open: boolean; onOpenChange: (o: boolean) => void; onOrdered: () => void }

export function CartSheet({ open, onOpenChange, onOrdered }: Props) {
  const cart = useCart()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const order = await api.createOrder(
        cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, removed: l.removed, extras: l.extras, comments: l.comments })),
        name.trim(),
      )
      try { localStorage.setItem(LAST_ORDER_KEY, order.id) } catch { /* sin almacenamiento: la URL del pedido sigue funcionando */ }
      cart.clear()
      onOpenChange(false)
      onOrdered()
      toast.success('¡Pedido enviado a cocina!')
      nav(`/pedido/${order.id}`)
    } catch (e) {
      setError(errorMessage(e))
      onOrdered()
    } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="text-2xl font-bold">Tu pedido</SheetTitle>
          <SheetDescription>Revisa, ajusta cantidades y confírmalo.</SheetDescription>
        </SheetHeader>

        {cart.lines.length === 0 ? (
          <Empty className="flex-1">
            <EmptyHeader>
              <EmptyMedia variant="icon"><ShoppingBag /></EmptyMedia>
              <EmptyTitle>Todavía no has pedido nada</EmptyTitle>
              <EmptyDescription>Elige algo de la carta y aparecerá aquí.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Ver la carta</Button>
          </Empty>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {cart.lines.map((l) => (
                <li key={l.lineId} className="grid gap-2 py-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl" aria-hidden>{l.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold">{l.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs">
                        {l.removedNames.length > 0 && <Badge variant="secondary">Sin {l.removedNames.join(', ')}</Badge>}
                        {l.extraNames.length > 0 && <Badge variant="outline">+ {l.extraNames.join(', ')}</Badge>}
                        {l.comments && <Badge variant="outline" className="font-normal text-muted-foreground">“{l.comments}”</Badge>}
                      </div>
                    </div>
                    <p className="num font-extrabold">{formatMoney(l.unitPrice * l.quantity)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-xl border border-border" role="group" aria-label={`Cantidad de ${l.name}`}>
                      <Button variant="ghost" size="icon-sm" onClick={() => cart.setQty(l.lineId, -1)} disabled={l.quantity <= 1} aria-label="Menos"><Minus aria-hidden /></Button>
                      <span className="num w-5 text-center text-sm font-extrabold">{l.quantity}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => cart.setQty(l.lineId, 1)} aria-label="Más"><Plus aria-hidden /></Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => cart.remove(l.lineId)}>
                      <Trash2 aria-hidden /> Quitar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="grid gap-3 border-t border-border bg-muted/50 p-5">
              <Field>
                <FieldLabel htmlFor="cart-name">¿A nombre de quién? <span className="font-normal text-muted-foreground">· opcional</span></FieldLabel>
                <Input id="cart-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ana" autoComplete="given-name" className="bg-card" />
              </Field>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="num font-heading text-3xl font-extrabold">{formatMoney(cart.total)}</span>
              </div>
              {busy ? (
                <Button size="lg" disabled><Spinner data-icon="inline-start" /> Enviando…</Button>
              ) : (
                <ShimmerButton onClick={submit} className="h-12 w-full text-base font-bold" borderRadius="0.75rem" shimmerColor="oklch(0.9 0.1 85)" background="var(--primary)" shimmerDuration="4s">Confirmar pedido</ShimmerButton>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
