import { AlertTriangle, LogOut, Store } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { InventoryTab } from '@/components/admin/InventoryTab'
import { MovementsTab } from '@/components/admin/MovementsTab'
import { OrdersTab } from '@/components/admin/OrdersTab'
import { ProductsTab } from '@/components/admin/ProductsTab'
import { SettingsTab } from '@/components/admin/SettingsTab'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, auth } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { useSettings } from '@/lib/settings'
import type { Ingredient, Movement, Order, Product } from '@/lib/types'

const POLL_MS = 8000

export default function Admin() {
  const nav = useNavigate()
  const { settings } = useSettings()
  const [user, setUser] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [movements, setMovements] = useState<Movement[] | null>(null)
  const [tab, setTab] = useState('orders')
  const seen = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())

  const logout = useCallback(() => { auth.clear(); nav('/admin/login', { replace: true }) }, [nav])
  useEffect(() => { window.addEventListener('pedidos:logout', logout); return () => window.removeEventListener('pedidos:logout', logout) }, [logout])

  const loadOrders = useCallback(async () => {
    try {
      const list = await api.admin.orders()
      if (seen.current) {
        const added = list.filter((o) => !seen.current!.has(o.id))
        if (added.length) {
          toast.info(added.length === 1 ? `Pedido nuevo de ${added[0].customerName}` : `${added.length} pedidos nuevos`)
          setFresh(new Set(added.map((o) => o.id)))
          setTimeout(() => setFresh(new Set()), 4000)
        }
      }
      seen.current = new Set(list.map((o) => o.id))
      setOrders(list)
    } catch (e) { if (orders === null) toast.error(errorMessage(e)) }
  }, [orders])

  const loadStock = useCallback(async () => {
    try {
      const [i, p, m] = await Promise.all([api.admin.ingredients(), api.admin.products(), api.admin.movements()])
      setIngredients(i); setProducts(p); setMovements(m)
    } catch (e) { toast.error(errorMessage(e)) }
  }, [])

  const refreshAll = useCallback(async () => { await Promise.all([loadOrders(), loadStock()]) }, [loadOrders, loadStock])

  useEffect(() => {
    if (!auth.get()) return
    api.me().then((r) => setUser(r.user.username)).catch(() => {})
    void refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!auth.get()) return
    const t = setInterval(() => { if (!document.hidden) { void loadOrders(); void loadStock() } }, POLL_MS)
    return () => clearInterval(t)
  }, [loadOrders, loadStock])

  if (!auth.get()) return <Navigate to="/admin/login" replace />

  const active = orders?.filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length ?? 0
  const pending = orders?.filter((o) => o.status === 'pending').length ?? 0
  const low = ingredients?.filter((i) => i.stock <= i.min_stock) ?? []

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <h1 className="flex items-center gap-2 font-heading text-lg font-extrabold"><span className="grid size-8 place-items-center rounded-lg bg-secondary" aria-hidden>🔥</span> {settings.restaurantName}</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" nativeButton={false} render={<Link to="/" />}><Store aria-hidden /> <span className="hidden sm:inline">Ver carta</span></Button>
            <span className="hidden px-2 text-sm text-muted-foreground sm:inline">{user}</span>
            <Button variant="outline" onClick={logout}><LogOut aria-hidden /> Salir</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {low.length > 0 && (
          <div role="status" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-secondary bg-secondary/40 px-4 py-3">
            <p className="flex items-center gap-2 font-bold"><AlertTriangle className="size-4" aria-hidden /> Por acabarse</p>
            <ul className="flex flex-wrap gap-1.5">
              {low.map((i) => <li key={i.id} className="num rounded-full bg-card px-2.5 py-0.5 text-sm font-semibold">{i.emoji} {i.name}: {i.stock} {i.unit}</li>)}
            </ul>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setTab('inventory')}>Reponer</Button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList variant="line" className="h-12 w-max gap-1">
              <TabsTrigger value="orders" className="h-11 px-4 text-base">Pedidos {active > 0 && <Badge className={pending ? 'bg-primary' : 'bg-foreground'}>{active}</Badge>}</TabsTrigger>
              <TabsTrigger value="inventory" className="h-11 px-4 text-base">Inventario {low.length > 0 && <Badge variant="secondary">{low.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="products" className="h-11 px-4 text-base">Carta</TabsTrigger>
              <TabsTrigger value="movements" className="h-11 px-4 text-base">Movimientos</TabsTrigger>
              <TabsTrigger value="settings" className="h-11 px-4 text-base">Ajustes</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="orders" className="pt-4"><OrdersTab orders={orders} fresh={fresh} onChanged={refreshAll} /></TabsContent>
          <TabsContent value="inventory" className="pt-4"><InventoryTab ingredients={ingredients} onChanged={loadStock} /></TabsContent>
          <TabsContent value="products" className="pt-4"><ProductsTab products={products} alertUnits={settings.clientAlertUnits} onChanged={loadStock} /></TabsContent>
          <TabsContent value="movements" className="pt-4"><MovementsTab movements={movements} /></TabsContent>
          <TabsContent value="settings" className="pt-4"><SettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
