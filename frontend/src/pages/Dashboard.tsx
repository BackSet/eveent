import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { nombre, email, roles, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight">Event</span>
            <span className="hidden sm:inline text-zinc-500 text-sm">Gestión Deportiva</span>
          </div>
          <button
            onClick={logout}
            className="text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition cursor-pointer"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h1 className="text-xl font-semibold mb-1">Bienvenido, {nombre}</h1>
          <p className="text-zinc-400 text-sm">{email}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {roles.map((r) => (
              <span
                key={r}
                className="text-xs font-medium px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700"
              >
                {r}
              </span>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Convocatorias</h2>
            <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1">
              Próximamente
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-6 text-center">
              <p className="text-zinc-500 text-sm">No hay convocatorias aún</p>
              <p className="text-zinc-600 text-xs mt-1">
                Crea una para empezar
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
