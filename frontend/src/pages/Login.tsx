import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Mail, Lock, User, ArrowRight, ShieldCheck, Trophy, Sparkles } from 'lucide-react'
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
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
      {/* Decorative Premium Ambient Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md z-10 transition-all duration-500">
        {/* Header / Brand Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-primary/10 border border-primary/20 mb-4 animate-float">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-gradient font-black">Event</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-xs font-medium">
            Plataforma Premium de Gestión de Eventos Deportivos
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-3xl p-8 border border-border/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-purple-500" />
          
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">
              {isRegister ? 'Crear una cuenta' : 'Ingresar al sistema'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Nombre Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                    <User size={18} />
                  </span>
                  <Input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="pl-10 rounded-xl border-border bg-background/50"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                  <Mail size={18} />
                </span>
                <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 rounded-xl border-border bg-background/50"
                    placeholder="correo@ejemplo.com"
                  />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60">
                  <Lock size={18} />
                </span>
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 rounded-xl border-border bg-background/50"
                    placeholder="••••••••"
                  />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 animate-pulse-slow">
                <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

<Button
                type="submit"
                className="glow-btn w-full rounded-xl py-6 gap-2 mt-2 group"
              >
                {isRegister ? 'Registrarse' : 'Ingresar'}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Button>
          </form>
        </div>

        {/* Toggle Mode Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-primary hover:text-primary/80 font-bold underline underline-offset-4 transition cursor-pointer"
          >
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  )
}
