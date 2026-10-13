import { ApiError } from '../api/http';
import type { ReservationStatus, SlotStatus } from '../api/types';

export const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  FREE: 'Libre',
  BUSY: 'Ocupada',
  BLOCKED: 'Bloqueada',
  PAST: 'Pasada',
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

export function toReservationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para esta acción.';
    }
    if (error.status === 404) {
      return 'No encontramos esa reserva.';
    }

    const raw = error.message.toLowerCase();
    if (error.status === 409 || raw.includes('overlap') || raw.includes('blocked')) {
      return 'Esa franja ya no está disponible. Elige otra.';
    }
    if (raw.includes('past') || raw.includes('already started')) {
      return 'Esa franja ya no se puede usar porque el horario ya pasó.';
    }
    if (raw.includes('operating hours') || raw.includes('align to')) {
      return 'El horario elegido está fuera de las franjas disponibles.';
    }
    if (raw.includes('single calendar day')) {
      return 'La reserva debe quedar en un solo día.';
    }
    if (raw.includes('cannot cancel')) {
      return 'Esta reserva ya no se puede cancelar.';
    }
    if (raw.includes('cannot transition')) {
      return 'Esta reserva ya no admite ese cambio de estado.';
    }
    if (raw.includes('rejection reason')) {
      return 'Indica un motivo de al menos 3 caracteres.';
    }
    if (error.status === 400) {
      return 'Revisa el horario seleccionado e inténtalo de nuevo.';
    }
  }

  return 'No hay conexión con el servidor. ¿Está corriendo la API?';
}
