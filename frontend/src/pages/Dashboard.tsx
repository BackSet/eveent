import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'
import { Calendar, Users, Trophy, ChevronRight, Sparkles, Activity, ShieldCheck } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner with Gradient & Glow */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-purple-600 p-8 text-white shadow-xl glow-primary">
        <div className="absolute right-[-5%] top-[-20%] w-[40%] h-[150%] rounded-full bg-white/5 blur-[50px] transform rotate-12" />
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={12} className="text-yellow-300 animate-pulse" />
            Panel de Control Premium
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            ¡Bienvenido de nuevo, {user?.nombre}!
          </h1>
          
          <p className="text-white/80 text-sm md:text-base font-medium">
            Estás conectado como <span className="underline decoration-yellow-400 decoration-2 font-bold">{user?.email}</span>. Gestiona tus convocatorias deportivas y asigna equipos de manera rápida y elegante.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {user?.roles?.map((r) => (
              <span
                key={r}
                className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white border border-white/10 uppercase tracking-wide"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-4 flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          Accesos Rápidos
        </h2>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Convocatorias */}
          <Link
            to="/convocatorias"
            className="glass-card rounded-2xl p-6 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between h-48 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                  Convocatorias
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Ver eventos y planificaciones
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                Explorar eventos
              </span>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {/* Card 2: Mis Asistencias */}
          <Link
            to="/mis-asistencias"
            className="glass-card rounded-2xl p-6 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between h-48 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full group-hover:bg-purple-500/10 transition-colors" />
            
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-purple-500 transition-colors">
                  Mis Asistencias
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Historial de convocatorias y respuestas
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-purple-500 transition-colors">
                Revisar asistencias
              </span>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {/* Card 3: Mi Perfil */}
          <Link
            to="/perfil"
            className="glass-card rounded-2xl p-6 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between h-48 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full group-hover:bg-yellow-500/10 transition-colors" />
            
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                  Mi Perfil
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Ver estadísticas e información
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                Ver mi cuenta
              </span>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </div>
      </div>

      {/* Information Section */}
      <div className="glass-card rounded-3xl p-6 border border-border flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-muted/20 to-primary/5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="font-bold text-foreground">Control de Acceso Basado en Roles (RBAC)</h4>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Esta plataforma protege tus datos según tus permisos. Algunas pestañas solo son visibles para administradores y organizadores.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}