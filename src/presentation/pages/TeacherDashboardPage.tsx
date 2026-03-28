import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import DashboardShell from '../layouts/DashboardShell'
import {
  type SalaDetalle,
  type SalaResumen,
  listarSalas,
  obtenerSalaDetalle,
} from '../../infrastructure/http/roomService'
import { useAuth } from '../../shared/context/AuthContext'
import './dashboard.css'

const formatNumber = (value: number) => new Intl.NumberFormat('es-CO').format(value)
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
  new Date(),
)
const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' })

const buildCalendarDays = () => {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const prefix = start.getDay()
  const cells: Array<{ label: string; muted?: boolean; active?: boolean }> = []

  for (let index = 0; index < prefix; index += 1) {
    cells.push({ label: '' })
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    cells.push({ label: String(day), active: day === today.getDate() })
  }

  return cells
}

function TeacherDashboardPage() {
  const { usuario } = useAuth()
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [selectedSalaId, setSelectedSalaId] = useState<number | null>(null)
  const [selectedSala, setSelectedSala] = useState<SalaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [error, setError] = useState('')

  const sessionHeaders = useMemo(
    () => ({
      facultadId: usuario?.idFacultad ?? 1,
      rol: usuario?.rol ?? 'DOCENTE',
    }),
    [usuario?.idFacultad, usuario?.rol],
  )

  useEffect(() => {
    if (!usuario) {
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await listarSalas(sessionHeaders)
        setSalas(data)
        setSelectedSalaId((current) => current ?? data[0]?.idSala ?? null)
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'No fue posible cargar las salas.',
        )
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [sessionHeaders, usuario])

  useEffect(() => {
    if (!selectedSalaId) {
      setSelectedSala(null)
      return
    }

    const loadDetail = async () => {
      try {
        setLoadingDetalle(true)
        setError('')
        const detail = await obtenerSalaDetalle(selectedSalaId, sessionHeaders)
        setSelectedSala(detail)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar el detalle de la sala.',
        )
      } finally {
        setLoadingDetalle(false)
      }
    }

    void loadDetail()
  }, [selectedSalaId, sessionHeaders])

  const stats = useMemo(() => {
    const habilitadas = salas.filter((sala) => sala.habilitada).length
    const recursosTotales = salas.reduce(
      (total, sala) => total + (selectedSala?.idSala === sala.idSala ? selectedSala.recursos.length : 0),
      0,
    )

    return [
      {
        label: 'Salas visibles',
        value: formatNumber(salas.length),
        note: 'Catalogo filtrado por tu facultad',
      },
      {
        label: 'Salas habilitadas',
        value: formatNumber(habilitadas),
        note: 'Listas para reserva o consulta',
      },
      {
        label: 'Recursos en detalle',
        value: formatNumber(recursosTotales),
        note: 'Inventario de la sala seleccionada',
      },
    ]
  }, [salas, selectedSala])

  const recomendaciones = useMemo(() => {
    if (!selectedSala) {
      return []
    }

    return [
      `Ubicacion: ${selectedSala.ubicacion}`,
      `Capacidad estimada: ${selectedSala.capacidad} personas`,
      selectedSala.habilitada ? 'Estado: disponible para gestion institucional' : 'Estado: temporalmente deshabilitada',
    ]
  }, [selectedSala])

  const calendarDays = useMemo(() => buildCalendarDays(), [])

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (usuario.rol === 'SECRETARIA') {
    return <Navigate to="/dashboard-secretaria" replace />
  }

  return (
    <DashboardShell
      title="My Dashboard"
      subtitle="View available rooms, inspect resources and prepare your next booking request."
      sectionLabel="Teacher workspace"
    >
      {error ? <div className="dashboard-alert error">{error}</div> : null}

      <section className="dashboard-toolbar">
        <div />
        <button type="button" className="dashboard-action-button">
          <span>+</span>
          Solicitar sala
        </button>
      </section>

      <section className="dashboard-stats-grid">
        {stats.map((item) => (
          <article key={item.label} className="metric-card">
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </article>
        ))}
      </section>

      <section className="teacher-board">
        <article className="dashboard-panel calendar-panel">
          <div className="panel-head">
            <div>
              <h3>Calendar</h3>
            </div>
          </div>

          <div className="calendar-board">
            <div className="calendar-header">
              <button type="button" className="calendar-arrow" aria-label="Previous month">
                {'<'}
              </button>
              <strong>{monthLabel}</strong>
              <button type="button" className="calendar-arrow" aria-label="Next month">
                {'>'}
              </button>
            </div>

            <div className="calendar-grid calendar-grid-head">
              {Array.from({ length: 7 }, (_, index) => {
                const sample = new Date(2026, 2, index + 1)
                return (
                  <span key={index} className="day-label">
                    {dayFormatter.format(sample).slice(0, 2)}
                  </span>
                )
              })}
            </div>

            <div className="calendar-grid">
              {calendarDays.map((cell, index) => (
                <span
                  key={`${cell.label}-${index}`}
                  className={`day-cell${cell.active ? ' active' : ''}${cell.muted ? ' muted' : ''}`}
                >
                  {cell.label}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="dashboard-panel booking-list-card">
          <div className="panel-head">
            <div>
              <h3>Room Overview</h3>
              <p className="panel-copy">Pick a room from your faculty to inspect its current profile.</p>
            </div>
          </div>

          <div className="room-list">
            {loading ? (
              <p className="empty-state">Loading rooms...</p>
            ) : salas.length === 0 ? (
              <p className="empty-state">No rooms available for this faculty yet.</p>
            ) : (
              salas.map((sala) => (
                <button
                  key={sala.idSala}
                  type="button"
                  className={`room-list-item${selectedSalaId === sala.idSala ? ' active' : ''}`}
                  onClick={() => setSelectedSalaId(sala.idSala)}
                >
                  <div>
                    <strong>{sala.nombre}</strong>
                    <span>{sala.ubicacion}</span>
                  </div>
                  <small className={sala.habilitada ? 'status-pill ok' : 'status-pill muted'}>
                    {sala.habilitada ? 'Open' : 'Offline'}
                  </small>
                </button>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-panels dashboard-panels-teacher">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h3>Selected Room</h3>
              <p className="panel-copy">
                {selectedSala
                  ? 'Live information coming from the backend for the room you selected.'
                  : 'Choose a room to view its details.'}
              </p>
            </div>
          </div>

          {loadingDetalle ? (
            <p className="empty-state">Loading room detail...</p>
          ) : !selectedSala ? (
            <p className="empty-state">Select a room to view inventory and capacity.</p>
          ) : (
            <div className="detail-stack">
              <div className="detail-highlight-grid">
                {recomendaciones.map((item) => (
                  <div key={item} className="detail-highlight">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <h3>Resources</h3>
              <p className="panel-copy">
                Equipment and assets associated with the selected room.
              </p>
            </div>
          </div>

          {!selectedSala ? (
            <p className="empty-state">The room inventory will appear here.</p>
          ) : selectedSala.recursos.length === 0 ? (
            <p className="empty-state">This room has no registered resources yet.</p>
          ) : (
            <div className="resource-grid">
              {selectedSala.recursos.map((recurso) => (
                <article key={recurso.idRecursoSala} className="resource-card">
                  <strong>{recurso.nombreRecurso}</strong>
                  <span>Code {recurso.codigoRecurso}</span>
                  <small>{recurso.cantidad} available</small>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </DashboardShell>
  )
}

export default TeacherDashboardPage
