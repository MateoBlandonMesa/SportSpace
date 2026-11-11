# language: es
@mvp @disponibilidad
Característica: Disponibilidad en tiempo real
  Como estudiante
  quiero ver franjas libres y ocupadas de un espacio en una fecha
  para solicitar solo horarios posibles.

  Antecedentes:
    Dado que existe el espacio activo "Pista sintética"
    Y que su horario de operación es lunes a viernes de "06:00" a "22:00" en zona "America/Bogota"
    Y que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"

  @HU-09 @RF-11
  Escenario: Franja libre cuando no hay reservas ni bloqueos
    Dado que no hay reservas ni bloqueos el "2026-10-05"
    Cuando consulta la disponibilidad de "Pista sintética" en "2026-10-05"
    Entonces las franjas dentro del horario de operación se muestran libres

  @HU-09 @RF-11
  Esquema del escenario: Franja ocupada por reserva que cuenta
    Dado que existe una reserva "<estado>" de "Pista sintética" de "08:00" a "10:00" el "2026-10-05"
    Cuando consulta la disponibilidad de "Pista sintética" en "2026-10-05"
    Entonces la franja de "08:00" a "10:00" se muestra ocupada

    Ejemplos:
      | estado   |
      | PENDING  |
      | APPROVED |

  @HU-09 @RF-11
  Esquema del escenario: Franja libre si la reserva no ocupa
    Dado que existe una reserva "<estado>" de "Pista sintética" de "08:00" a "10:00" el "2026-10-05"
    Cuando consulta la disponibilidad de "Pista sintética" en "2026-10-05"
    Entonces la franja de "08:00" a "10:00" se muestra libre

    Ejemplos:
      | estado     |
      | CANCELLED  |
      | REJECTED   |

  @HU-09 @RF-12
  Escenario: No se ofrecen franjas en fechas pasadas
    Cuando consulta la disponibilidad de "Pista sintética" en una fecha ya transcurrida
    Entonces no se ofrecen franjas reservables

  @HU-09 @RF-11
  Escenario: La consulta refleja una reserva recién creada
    Dado que la franja de "14:00" a "16:00" el "2026-10-05" está libre
    Cuando otro usuario crea una reserva "PENDING" en esa franja
    Y "ana.estudiante@udea.edu.co" vuelve a consultar la disponibilidad
    Entonces la franja de "14:00" a "16:00" se muestra ocupada

  @HU-10 @RF-13
  Escenario: Staff define horario y un bloqueo
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Cuando define el horario de "Pista sintética" de lunes a viernes de "06:00" a "22:00"
    Y bloquea "2026-10-05" de "09:00" a "12:00" por "mantenimiento"
    Entonces esa franja se muestra no disponible en la consulta de disponibilidad
    Y no se puede solicitar una reserva en el intervalo bloqueado

  @HU-10 @RF-13
  Escenario: Staff consulta y configura horarios distintos por día
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Y que el espacio tiene horario el lunes de "06:00" a "22:00" y el martes de "08:00" a "18:00"
    Cuando consulta el horario semanal de "Pista sintética"
    Entonces se muestran las reglas actuales ordenadas por día
    Cuando guarda un nuevo horario semanal con el lunes de "07:00" a "21:00" y el martes de "09:00" a "17:00"
    Entonces el horario guardado conserva el rango individual de cada día

  @HU-10 @RF-13
  Escenario: Staff consulta y elimina un bloqueo
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Y que existe un bloqueo de "Pista sintética" el "2026-10-05" de "09:00" a "12:00" por "mantenimiento"
    Cuando consulta los bloqueos de "Pista sintética" entre "2026-10-05T00:00:00-05:00" y "2026-10-06T00:00:00-05:00"
    Entonces el bloqueo de mantenimiento aparece en la lista
    Cuando elimina el bloqueo consultado
    Entonces las franjas vuelven a estar disponibles si no existe otra reserva o bloqueo
