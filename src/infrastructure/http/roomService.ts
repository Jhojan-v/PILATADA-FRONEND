import { API_BASE_URL } from './apiConfig'

type EncabezadosSala = {
  usuarioId?: string | number
  facultadId?: number | null
  rol?: string
}

export type SalaResumen = {
  idSala: number
  nombre: string
  ubicacion: string
  capacidad: number
  habilitada: boolean
}

export type RecursoSala = {
  idRecursoSala: number
  codigoRecurso: string
  nombreRecurso: string
  cantidad: number
}

export type SalaDetalle = SalaResumen & {
  facultadId: number
  recursos: RecursoSala[]
}

export type EstadoSalaResponse = {
  idSala: number
  habilitada: boolean
  mensaje: string
}

export type RecursoSalaResponse = {
  idRecursoSala: number
  codigoRecurso: string
  nombreRecurso: string
  cantidad: number
  mensaje: string
}

const crearHeaders = (sesion?: EncabezadosSala, conBody = false) => {
  const headers: Record<string, string> = {
    'X-Usuario-Id': String(sesion?.usuarioId ?? 1),
    'X-Facultad-Id': String(sesion?.facultadId ?? 1),
    'X-Rol': sesion?.rol ?? 'SECRETARIA',
  }

  if (conBody) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const rawBody = await response.text()
  const data = rawBody ? (JSON.parse(rawBody) as T & { mensaje?: string; message?: string }) : null

  if (!response.ok) {
    throw new Error(data?.mensaje || data?.message || 'No fue posible completar la solicitud.')
  }

  return data as T
}

const ejecutarPeticion = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error('No fue posible conectar con el backend en http://localhost:8080.')
  }

  return parseResponse<T>(response)
}

export const listarSalas = async (sesion?: EncabezadosSala) =>
  ejecutarPeticion<SalaResumen[]>('/api/salas', {
    headers: crearHeaders(sesion),
  })

export const obtenerSalaDetalle = async (idSala: number, sesion?: EncabezadosSala) =>
  ejecutarPeticion<SalaDetalle>(`/api/salas/${idSala}`, {
    headers: crearHeaders(sesion),
  })

export const editarSala = async (
  idSala: number,
  datos: Pick<SalaDetalle, 'nombre' | 'ubicacion' | 'capacidad'>,
  sesion?: EncabezadosSala,
) =>
  ejecutarPeticion<SalaDetalle>(`/api/salas/${idSala}`, {
    method: 'PUT',
    headers: crearHeaders(sesion, true),
    body: JSON.stringify(datos),
  })

export const actualizarEstadoSala = async (
  idSala: number,
  habilitada: boolean,
  sesion?: EncabezadosSala,
) =>
  ejecutarPeticion<EstadoSalaResponse>(`/api/salas/${idSala}/estado`, {
    method: 'PATCH',
    headers: crearHeaders(sesion, true),
    body: JSON.stringify({ habilitada }),
  })

export const agregarRecursoSala = async (
  idSala: number,
  datos: Pick<RecursoSala, 'codigoRecurso' | 'nombreRecurso' | 'cantidad'>,
  sesion?: EncabezadosSala,
) =>
  ejecutarPeticion<RecursoSalaResponse>(`/api/salas/${idSala}/recursos`, {
    method: 'POST',
    headers: crearHeaders(sesion, true),
    body: JSON.stringify(datos),
  })

export const crearSala = async (datos: {
  nombre: string
  ubicacion: string
  capacidad: number
  facultad: string
}) => {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/salas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': '1',
        'X-Facultad-Id': '1',
        'X-Rol': 'SECRETARIA',
      },
      body: JSON.stringify({
        nombre: datos.nombre,
        ubicacion: datos.ubicacion,
        capacidad: datos.capacidad,
        facultad: datos.facultad,
      }),
    })
  } catch {
    throw new Error('No fue posible conectar con el backend en http://localhost:8080.')
  }

  if (response.status === 405) {
    throw new Error(
      'El backend actual no tiene habilitado un endpoint POST para crear salas todavia.',
    )
  }

  return parseResponse(response)
}
