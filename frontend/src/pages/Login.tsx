import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Mail, Lock, User, ArrowRight, ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const { login, register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (isRegister) {
        await register(nombre, email, password)
      } else {
        await login(email, password)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de autenticación'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-[380px] space-y-6">
        {/* Logo / Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="text-4xl select-none mb-1">🏆</div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Event</h1>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Workspace de gestión y coordinación de eventos deportivos.
          </p>
        </div>

        {/* Flat Notion Login Container */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4 shadow-none">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {isRegister ? 'Crear nueva cuenta en el Workspace' : 'Iniciar sesión'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Nombre Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                    <User size={13} />
                  </span>
                  <Input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                  <Mail size={13} />
                </span>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                  <Lock size={13} />
                </span>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9 h-9 text-xs border-border bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="notion-callout border-destructive/20 bg-destructive/5 text-destructive p-3 rounded">
                <div className="notion-callout-icon">
                  <ShieldAlert size={14} className="shrink-0" />
                </div>
                <div className="text-[11px] font-medium leading-normal">{error}</div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-9 font-semibold text-xs rounded shadow-none bg-primary text-primary-foreground hover:bg-primary/90 mt-2 gap-1.5"
            >
              <span>{isRegister ? 'Registrarse' : 'Continuar'}</span>
              <ArrowRight size={13} />
            </Button>
          </form>
        </div>

        {/* Toggle Mode Footer */}
        <p className="text-center text-xs text-muted-foreground">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-foreground hover:underline font-bold transition cursor-pointer"
          >
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  )
}
