# language: es
@mvp @administracion
Característica: Dashboard de ocupación y gestión de roles
  Como staff o administrador
  quiero ver ocupación semanal y asignar roles en la aplicación
  para programar espacios y operar el prototipo sin tocar la base de datos.

  @HU-19 @RF-22
  Escenario: Staff ve ocupación de una semana
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Y que "Pista sintética" tiene horario hábil de 80 horas en la semana del "2026-10-12"
    Y que hay 8 horas en reservas "PENDING" o "APPROVED" esa semana
    Cuando abre el dashboard de ocupación para la semana del "2026-10-12"
    Entonces ve "Pista sintética" con 8 horas ocupadas sobre 80 habilitadas

  @HU-19 @RF-22
  Escenario: Reservas canceladas o rechazadas no cuentan en el dashboard
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Y que en la semana del "2026-10-12" "Pista sintética" solo tiene reservas "CANCELLED" y "REJECTED"
    Cuando abre el dashboard de ocupación para esa semana
    Entonces la ocupación de "Pista sintética" es 0 %

  @HU-19 @RF-22
  Escenario: Semana sin reservas muestra cero
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Y que no hay reservas en la semana del "2026-11-02"
    Cuando abre el dashboard de ocupación para esa semana
    Entonces todos los espacios muestran ocupación 0 %
    Y no se muestra un error técnico

  @HU-19 @RF-22
  Escenario: Filtro por un espacio en el dashboard
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Y que existen "Pista sintética" y "Coliseo"
    Cuando filtra el dashboard por "Pista sintética" en una semana
    Entonces solo ve la ocupación de "Pista sintética"

  @HU-19 @RF-22
  Escenario: Bloqueos restan de horas habilitadas
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Y que "Pista sintética" tiene 80 horas hábiles y 10 horas bloqueadas por mantenimiento en la semana
    Cuando abre el dashboard de esa semana
    Entonces las horas habilitadas de "Pista sintética" son 70
    Y las horas bloqueadas no aparecen como ocupación de usuarios

  @HU-19 @HU-04
  Escenario: Estudiante no accede al dashboard
    Dado que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Cuando solicita el dashboard de ocupación
    Entonces el sistema responde 403

  @HU-20 @RF-21
  Escenario: Admin promociona un estudiante a staff
    Dado que "lucia.admin@udea.edu.co" inició sesión con rol "ADMIN"
    Y que existe el usuario "ana.estudiante@udea.edu.co" con rol "STUDENT"
    Cuando cambia el rol de "ana.estudiante@udea.edu.co" a "STAFF"
    Entonces el usuario queda con rol "STAFF"
    Y en la siguiente petición puede gestionar espacios
    Y queda un registro de auditoría del cambio de rol

  @HU-20 @RF-21
  Escenario: Admin promociona un usuario a administrador
    Dado que "lucia.admin@udea.edu.co" inició sesión con rol "ADMIN"
    Y que existe el usuario "carlos.staff@udea.edu.co" con rol "STAFF"
    Cuando cambia el rol de "carlos.staff@udea.edu.co" a "ADMIN"
    Entonces el usuario queda con rol "ADMIN"

  @HU-20 @RF-21
  Escenario: No se puede dejar el sistema sin administradores
    Dado que "lucia.admin@udea.edu.co" es el único usuario con rol "ADMIN"
    Y que inició sesión
    Cuando intenta cambiar su propio rol a "STAFF"
    Entonces el sistema rechaza la operación
    Y "lucia.admin@udea.edu.co" sigue con rol "ADMIN"

  @HU-20 @RF-21 @HU-04
  Escenario: Staff no puede cambiar roles
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Cuando intenta cambiar el rol de "ana.estudiante@udea.edu.co"
    Entonces el sistema responde 403

  @HU-20 @RF-21
  Escenario: Estudiante no puede listar usuarios para gestionar roles
    Dado que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Cuando solicita el listado de usuarios para cambio de rol
    Entonces el sistema responde 403
