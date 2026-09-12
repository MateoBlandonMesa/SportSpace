# language: es
@mvp @reservas
Característica: Gestión de reservas
  Como estudiante o staff
  quiero solicitar, listar, cancelar y decidir reservas
  para usar los espacios sin conflictos de horario.

  Antecedentes:
    Dado que existe el espacio activo "Pista sintética" con horario hábil el "2026-10-12" de "06:00" a "22:00"
    Y que "ana.estudiante@udea.edu.co" tiene rol "STUDENT"
    Y que "carlos.staff@udea.edu.co" tiene rol "STAFF"

  @HU-11 @RF-14 @RF-15
  Escenario: Solicitud exitosa en franja libre
    Dado que "ana.estudiante@udea.edu.co" inició sesión
    Y que la franja de "08:00" a "10:00" el "2026-10-12" está libre
    Cuando solicita "Pista sintética" de "08:00" a "10:00" el "2026-10-12"
    Entonces se crea una reserva en estado "PENDING"
    Y queda asociada a "ana.estudiante@udea.edu.co"

  @HU-11 @RF-15
  Esquema del escenario: Solicitud rechazada por intervalo inválido
    Dado que "ana.estudiante@udea.edu.co" inició sesión
    Cuando solicita "Pista sintética" con intervalo inválido "<caso>"
    Entonces el sistema rechaza la solicitud con un error de validación
    Y no se crea la reserva

    Ejemplos:
      | caso            |
      | fin menor que inicio |
      | fecha pasada    |
      | espacio inactivo |

  @HU-12 @RF-16 @RNF-05
  Escenario: Conflicto cuando la franja ya está ocupada
    Dado que existe una reserva "PENDING" de "Pista sintética" de "08:00" a "10:00" el "2026-10-12"
    Y que "ana.estudiante@udea.edu.co" inició sesión
    Cuando solicita "Pista sintética" de "08:00" a "10:00" el "2026-10-12"
    Entonces el sistema rechaza la solicitud por conflicto
    Y el usuario ve un mensaje entendible
    Y no se crea una segunda reserva

  @HU-12 @RF-16 @RNF-05
  Escenario: Condición de carrera de dos solicitudes simultáneas
    Dado que la franja de "16:00" a "18:00" el "2026-10-12" está libre
    Cuando dos estudiantes envían al mismo tiempo un POST de reserva sobre esa franja
    Entonces a lo sumo una reserva queda en estado "PENDING" o "APPROVED"
    Y la otra recibe error de conflicto

  @HU-13 @RF-17
  Escenario: El estudiante solo ve sus reservas
    Dado que "ana.estudiante@udea.edu.co" tiene una reserva "PENDING" en "Pista sintética"
    Y que otro estudiante tiene una reserva distinta
    Cuando "ana.estudiante@udea.edu.co" lista "mis reservas"
    Entonces solo ve las suyas
    Y cada ítem muestra espacio, intervalo y estado

  @HU-13 @RF-17
  Escenario: Motivo visible en reserva rechazada
    Dado que "ana.estudiante@udea.edu.co" tiene una reserva "REJECTED" con motivo "Evento institucional"
    Cuando lista "mis reservas"
    Entonces ve el motivo "Evento institucional"

  @HU-14 @RF-18
  Escenario: Cancelar reserva propia futura
    Dado que "ana.estudiante@udea.edu.co" tiene una reserva "APPROVED" que aún no inicia
    Cuando la cancela
    Entonces la reserva pasa a "CANCELLED"
    Y la franja queda libre

  @HU-14 @RF-18
  Escenario: No cancelar reserva de otro usuario
    Dado que existe una reserva futura de otro estudiante
    Y que "ana.estudiante@udea.edu.co" inició sesión
    Cuando intenta cancelarla
    Entonces el sistema responde 403

  @HU-14 @RF-18
  Escenario: No cancelar reserva ya iniciada o rechazada
    Dado que "ana.estudiante@udea.edu.co" tiene una reserva en estado "REJECTED"
    Cuando intenta cancelarla
    Entonces el sistema rechaza la cancelación

  @HU-15 @RF-19 @RNF-07
  Escenario: Staff aprueba una reserva pendiente
    Dado que existe una reserva "PENDING" de "ana.estudiante@udea.edu.co"
    Y que "carlos.staff@udea.edu.co" inició sesión
    Cuando aprueba la reserva
    Entonces el estado pasa a "APPROVED"
    Y queda un registro de auditoría con actor, origen "PENDING" y destino "APPROVED"

  @HU-15 @RF-19
  Escenario: Staff rechaza una reserva con motivo
    Dado que existe una reserva "PENDING" de "ana.estudiante@udea.edu.co"
    Y que "carlos.staff@udea.edu.co" inició sesión
    Cuando la rechaza con motivo "Cancha en mantenimiento"
    Entonces el estado pasa a "REJECTED"
    Y el motivo queda asociado a la reserva

  @HU-15 @RF-19
  Escenario: Rechazo sin motivo no es válido
    Dado que existe una reserva "PENDING"
    Y que "carlos.staff@udea.edu.co" inició sesión
    Cuando intenta rechazarla con motivo vacío
    Entonces el sistema rechaza la operación
    Y el estado sigue "PENDING"

  @HU-15 @HU-04
  Escenario: Estudiante no puede aprobar
    Dado que "ana.estudiante@udea.edu.co" inició sesión
    Y que existe una reserva "PENDING"
    Cuando intenta aprobarla
    Entonces el sistema responde 403

  @HU-16 @RF-20
  Esquema del escenario: Transiciones de estado legales e ilegales
    Dado que existe una reserva en estado "<origen>"
    Cuando se intenta transicionar a "<destino>" con un actor autorizado
    Entonces el resultado es "<resultado>"

    Ejemplos:
      | origen    | destino   | resultado |
      | PENDING   | APPROVED  | permitido |
      | PENDING   | REJECTED  | permitido |
      | PENDING   | CANCELLED | permitido |
      | APPROVED  | CANCELLED | permitido |
      | APPROVED  | PENDING   | 409       |
      | REJECTED  | APPROVED  | 409       |
      | CANCELLED | PENDING   | 409       |
