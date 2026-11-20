import { Flame, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MagicCard } from '@/components/ui/magic-card'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { formatMoney, tileFor } from '@/lib/format'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props { product: Product; alertUnits: number; index: number; onPick: (p: Product) => void }

export function ProductCard({ product: p, alertUnits, index, onPick }: Props) {
  const out = p.availableUnits <= 0
  const low = !out && p.availableUnits <= alertUnits
  const label = out ? `${p.name}, agotado` : `Añadir ${p.name}`

  return (
    <motion.article
      initial={{ opacity: 0, y: 12, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.04, 0.24) }}
      className="h-full"
    >
      <MagicCard className="h-full rounded-xl" gradientSize={220} gradientOpacity={out ? 0 : 0.5}>
        <Card className={cn('h-full ring-0', out && 'opacity-70')}>
          <CardHeader>
            <div className="sticker relative grid aspect-[5/3] place-items-center rounded-xl text-[4.5rem] leading-none select-none" style={{ backgroundColor: out ? 'var(--muted)' : tileFor(p.id) }} aria-hidden>
              <span className={cn(out && 'grayscale')}>{p.emoji}</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-xl leading-tight font-bold">{p.name}</CardTitle>
              <span className="num shrink-0 pt-0.5 text-lg font-extrabold text-primary">{formatMoney(p.price)}</span>
            </div>
            <CardDescription className="flex-1 text-sm">{p.description}</CardDescription>
            {(out || low) && (
              <Badge variant={out ? 'destructive' : 'secondary'} className="h-6 w-fit gap-1.5 px-2.5 font-bold">
                <Flame data-icon="inline-start" />
                {out ? 'Agotado por hoy' : p.availableUnits === 1 ? '¡Queda 1 solo!' : `Quedan ${p.availableUnits}`}
              </Badge>
            )}
          </CardContent>
          <CardFooter className="border-t-0 bg-transparent pb-4">
            {out ? (
              <Button size="lg" className="w-full" disabled aria-label={label}>Agotado</Button>
            ) : (
              <ShimmerButton onClick={() => onPick(p)} aria-label={label} className="h-12 w-full text-base font-bold" borderRadius="0.75rem" shimmerColor="oklch(0.9 0.1 85)" background="var(--primary)" shimmerDuration="4s">
                <Plus className="mr-1.5 size-5" aria-hidden />Añadir
              </ShimmerButton>
            )}
          </CardFooter>
        </Card>
      </MagicCard>
    </motion.article>
  )
}
