import { Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BorderBeam } from '@/components/ui/border-beam'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { api, auth } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { useSettings } from '@/lib/settings'

export default function Login() {
  const nav = useNavigate()
  const { settings } = useSettings()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const { token } = await api.login(username.trim(), password)
      auth.set(token)
      nav('/admin', { replace: true })
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Card className="relative w-full max-w-sm">
        <BorderBeam size={120} duration={8} colorFrom="var(--primary)" colorTo="var(--secondary)" />
        <CardHeader>
          <span className="sticker grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground" aria-hidden><Lock className="size-5" /></span>
          <CardTitle className="mt-2 text-3xl font-extrabold">Panel del personal</CardTitle>
          <CardDescription>{settings.restaurantName}. Entra para gestionar pedidos y stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="login-form" onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="user">Usuario</FieldLabel>
                <Input id="user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="pass">Contraseña</FieldLabel>
                <Input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </Field>
              {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-3 border-t-0 bg-transparent">
          <Button type="submit" form="login-form" size="lg" disabled={busy} className="w-full">{busy ? <><Spinner data-icon="inline-start" /> Entrando…</> : 'Entrar'}</Button>
          <Link to="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Volver a la carta</Link>
        </CardFooter>
      </Card>
    </main>
  )
}
