import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import DashboardShell from '../layouts/DashboardShell'
import {
  type SalaDetalle,
  type SalaResumen,
  agregarRecursoSala,
  actualizarEstadoSala,
  editarSala,
  listarSalas,
  obtenerSalaDetalle,
} from '../../infrastructure/http/roomService'
import { useAuth } from '../../shared/context/AuthContext'
import './dashboard.css'

const emptyEditForm = {
  nombre: '',
  ubicacion: '',
  capacidad: 2,
}

const emptyResourceForm = {
  codigoRecurso: '',
  nombreRecurso: '',
  cantidad: 1,
}

function SecretaryDashboardPage() {
  const { usuario } = useAuth()
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [selectedSalaId, setSelectedSalaId] = useState<number | null>(null)
  const [selectedSala, setSelectedSala] = useState<SalaDetalle | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [resourceForm, setResourceForm] = useState(emptyResourceForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('Sincronizando salas...')
  const [error, setError] = useState('')

  const sessionHeaders = useMemo(
    () => ({
      facultadId: usuario?.idFacultad ?? 1,
      rol: usuario?.rol ?? 'SECRETARIA',
    }),
    [usuario?.idFacultad, usuario?.rol],
  )

  const loadSalas = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await listarSalas(sessionHeaders)
      setSalas(data)
      setMessage(`${data.length} salas sincronizadas con el backend.`)
      setSelectedSalaId((current) => current ?? data[0]?.idSala ?? null)
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'No fue posible cargar las salas.',
      )
      setMessage('No pudimos sincronizar el panel con el backend.')
    } finally {
      setLoading(false)
    }
  }

  const loadSalaDetalle = async (idSala: number) => {
    try {
      setError('')
      const detail = await obtenerSalaDetalle(idSala, sessionHeaders)
      setSelectedSala(detail)
      setEditForm({
        nombre: detail.nombre,
        ubicacion: detail.ubicacion,
        capacidad: detail.capacidad,
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible cargar el detalle de la sala.',
      )
    }
  }

  useEffect(() => {
    if (!usuario) {
      return
    }

    void loadSalas()
  }, [sessionHeaders, usuario])

  useEffect(() => {
    if (selectedSalaId !== null) {
      void loadSalaDetalle(selectedSalaId)
    }
  }, [selectedSalaId, sessionHeaders])

  const stats = useMemo(() => {
    const habilitadas = salas.filter((sala) => sala.habilitada).length
    const deshabilitadas = salas.length - habilitadas
    const capacidadTotal = salas.reduce((total, sala) => total + sala.capacidad, 0)

    return [
      {
        label: 'Salas registradas',
        value: salas.length,
        note: 'Catalogo bajo tu gestion',
      },
      {
        label: 'Salas activas',
        value: habilitadas,
        note: 'Disponibles para operaciones',
      },
      {
        label: 'Salas deshabilitadas',
        value: deshabilitadas,
        note: 'Requieren seguimiento',
      },
      {
        label: 'Capacidad total',
        value: capacidadTotal,
        note: 'Aforo consolidado de la facultad',
      },
    ]
  }, [salas])

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedSalaId) {
      return
    }

    try {
      setSaving(true)
      setError('')
      const data = await editarSala(selectedSalaId, editForm, sessionHeaders)
      setSelectedSala(data)
      setMessage(`Sala ${data.nombre} actualizada correctamente.`)
      await loadSalas()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible actualizar la sala.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedSala) {
      return
    }

    try {
      setSaving(true)
      setError('')
      const response = await actualizarEstadoSala(
        selectedSala.idSala,
        !selectedSala.habilitada,
        sessionHeaders,
      )
      setMessage(response.mensaje)
      await loadSalas()
      await loadSalaDetalle(selectedSala.idSala)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible cambiar el estado de la sala.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleResourceSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedSalaId) {
      return
    }

    try {
      setSaving(true)
      setError('')
      const response = await agregarRecursoSala(selectedSalaId, resourceForm, sessionHeaders)
      setMessage(response.mensaje)
      setResourceForm(emptyResourceForm)
      await loadSalaDetalle(selectedSalaId)
      await loadSalas()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible agregar el recurso.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (usuario.rol !== 'SECRETARIA') {
    return <Navigate to="/dashboard-docente" replace />
  }

  return (
    <DashboardShell
      title="Dashboard de secretaria"
      subtitle="Administra el estado de las salas, ajusta su informacion y refuerza el inventario desde un panel mas potente."
      sectionLabel="Control administrativo"
    >
      {error ? <div className="dashboard-alert error">{error}</div> : null}

      <section className="dashboard-hero-card">
        <div>
          <p className="dashboard-eyebrow">Prototipo aterrizado</p>
          <h3>Una consola con la misma energia visual del mockup</h3>
          <p>
            Mantuvimos la vibra del dashboard que me compartiste, pero ahora conectada a la
            estructura del proyecto y a los endpoints reales del backend.
          </p>
        </div>

        <div className="dashboard-hero-badge">
          <strong>{loading ? 'Sincronizando' : 'Backend enlazado'}</strong>
          <span>{message}</span>
        </div>
      </section>

      <section className="dashboard-stats-grid dashboard-stats-grid-secretary">
        {stats.map((item) => (
          <article key={item.label} className="metric-card">
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-panels dashboard-panels-secretary">
        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <p className="dashboard-eyebrow">Catalogo de salas</p>
              <h3>Gestion central</h3>
            </div>
            <button type="button" className="secondary-button" onClick={() => void loadSalas()}>
              Recargar
            </button>
          </div>

          <div className="room-list">
            {loading ? (
              <p className="empty-state">Cargando salas...</p>
            ) : salas.length === 0 ? (
              <p className="empty-state">No hay salas registradas para esta facultad.</p>
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
                    {sala.habilitada ? 'Activa' : 'Bloqueada'}
                  </small>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-head">
            <div>
              <p className="dashboard-eyebrow">Sala seleccionada</p>
              <h3>{selectedSala?.nombre ?? 'Detalle y acciones'}</h3>
            </div>
            {selectedSala ? (
              <button type="button" className="primary-button" onClick={handleToggleStatus}>
                {saving
                  ? 'Guardando...'
                  : selectedSala.habilitada
                    ? 'Deshabilitar sala'
                    : 'Habilitar sala'}
              </button>
            ) : null}
          </div>

          {!selectedSala ? (
            <p className="empty-state">Selecciona una sala para administrar sus datos.</p>
          ) : (
            <div className="detail-stack">
              <div className="detail-highlight-grid">
                <div className="detail-highlight">Ubicacion: {selectedSala.ubicacion}</div>
                <div className="detail-highlight">Capacidad: {selectedSala.capacidad} personas</div>
                <div className="detail-highlight">
                  Estado actual: {selectedSala.habilitada ? 'habilitada' : 'deshabilitada'}
                </div>
              </div>

              <div className="dashboard-form-grid">
                <form className="dashboard-form-card" onSubmit={handleEditSubmit}>
                  <div className="panel-subhead">
                    <h4>Editar sala</h4>
                    <span>Datos base</span>
                  </div>

                  <label>
                    Nombre
                    <input
                      value={editForm.nombre}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, nombre: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Ubicacion
                    <input
                      value={editForm.ubicacion}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, ubicacion: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Capacidad
                    <input
                      type="number"
                      min={2}
                      value={editForm.capacidad}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          capacidad: Number(event.target.value) || 2,
                        }))
                      }
                    />
                  </label>

                  <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? 'Actualizando...' : 'Guardar cambios'}
                  </button>
                </form>

                <form className="dashboard-form-card" onSubmit={handleResourceSubmit}>
                  <div className="panel-subhead">
                    <h4>Agregar recurso</h4>
                    <span>Inventario rapido</span>
                  </div>

                  <label>
                    Codigo
                    <input
                      value={resourceForm.codigoRecurso}
                      onChange={(event) =>
                        setResourceForm((current) => ({
                          ...current,
                          codigoRecurso: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Nombre del recurso
                    <input
                      value={resourceForm.nombreRecurso}
                      onChange={(event) =>
                        setResourceForm((current) => ({
                          ...current,
                          nombreRecurso: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Cantidad
                    <input
                      type="number"
                      min={1}
                      value={resourceForm.cantidad}
                      onChange={(event) =>
                        setResourceForm((current) => ({
                          ...current,
                          cantidad: Number(event.target.value) || 1,
                        }))
                      }
                    />
                  </label>

                  <button type="submit" className="secondary-button" disabled={saving}>
                    {saving ? 'Agregando...' : 'Sumar recurso'}
                  </button>
                </form>
              </div>

              <section>
                <div className="panel-subhead">
                  <h4>Recursos actuales</h4>
                  <span>{selectedSala.recursos.length} registrados</span>
                </div>

                {selectedSala.recursos.length === 0 ? (
                  <p className="empty-state">Esta sala aun no tiene recursos registrados.</p>
                ) : (
                  <div className="resource-table">
                    {selectedSala.recursos.map((recurso) => (
                      <div key={recurso.idRecursoSala} className="resource-row">
                        <div>
                          <strong>{recurso.nombreRecurso}</strong>
                          <span>{recurso.codigoRecurso}</span>
                        </div>
                        <small>{recurso.cantidad} unidades</small>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </article>
      </section>
    </DashboardShell>
  )
}

export default SecretaryDashboardPage
