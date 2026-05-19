import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { nombre, email, roles, logout } = useAuth()

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Bienvenido, {nombre}</h1>
          <p>{email}</p>
          <p>
            Roles: <strong>{roles.join(', ')}</strong>
          </p>
        </div>
        <button onClick={logout} style={{ padding: '8px 16px' }}>
          Cerrar Sesion
        </button>
      </div>

      <hr style={{ margin: '24px 0' }} />

      <section>
        <h2>Panel de Convocatorias</h2>
        <p>Proximamente: listado de convocatorias, creacion, RSVP, division de equipos.</p>
      </section>
    </div>
  )
}
