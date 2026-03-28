import type { PropsWithChildren } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/context/AuthContext'

type DashboardShellProps = PropsWithChildren<{
  title: string
  subtitle: string
  sectionLabel: string
}>

function DashboardShell({
  children,
  title,
  subtitle,
  sectionLabel,
}: DashboardShellProps) {
  const navigate = useNavigate()
  const { usuario, cerrarSesion } = useAuth()

  const inicial = usuario?.correo?.charAt(0).toUpperCase() ?? 'U'

  const items = usuario?.rol === 'SECRETARIA'
    ? [
        { to: '/dashboard-secretaria', label: 'Panel principal' },
        { to: '/crear-sala', label: 'Crear sala' },
      ]
    : [{ to: '/dashboard-docente', label: 'Explorar salas' }]

  const handleLogout = () => {
    cerrarSesion()
    navigate('/login')
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-mark">U</div>
          <div>
            <h1>UniRoom</h1>
            <p>Booking System</p>
          </div>
        </div>

        <nav className="dashboard-nav" aria-label="Navegacion principal">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `dashboard-nav-link${isActive ? ' active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          <div className="dashboard-user-card">
            <span>{inicial}</span>
            <div>
              <strong>{usuario?.rol ?? 'INVITADO'}</strong>
              <p>{usuario?.facultad || 'Universidad UAO'}</p>
            </div>
          </div>

          <button type="button" className="dashboard-logout" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-leading">
            <button type="button" className="dashboard-icon-button" aria-label="Panel">
              <span />
              <span />
            </button>

            <div>
            <p className="dashboard-section-label">{sectionLabel}</p>
            <h2>{title}</h2>
            <p>{subtitle}</p>
            </div>
          </div>

          <div className="dashboard-topbar-user">
            <span>{inicial}</span>
            <div>
              <strong>{usuario?.correo ?? 'sin sesion'}</strong>
              <p>{usuario?.rol ?? 'Sin rol'}</p>
            </div>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}

export default DashboardShell
