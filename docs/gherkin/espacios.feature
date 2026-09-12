# language: es
@mvp @espacios
Característica: Catálogo de espacios deportivos
  Como usuario autenticado
  quiero consultar y, si soy staff, gestionar espacios
  para saber qué escenarios existen y mantener el catálogo.

  Antecedentes:
    Dado que existe el espacio activo "Pista sintética de atletismo" de tipo "pista" en campus "Ciudad Universitaria"
    Y que existe el espacio inactivo "Cancha auxiliar" de tipo "cancha" en campus "Ciudad Universitaria"

  @HU-05 @RF-07
  Escenario: Estudiante ve solo espacios activos
    Dado que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Cuando consulta el catálogo de espacios
    Entonces ve "Pista sintética de atletismo"
    Y no ve "Cancha auxiliar"

  @HU-05 @RF-07
  Escenario: Visitante no autenticado no ve el catálogo
    Dado que no hay una sesión activa
    Cuando se solicita el catálogo de espacios
    Entonces el sistema responde 401

  @HU-05
  Escenario: Catálogo vacío
    Dado que no hay espacios activos
    Y que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Cuando consulta el catálogo de espacios
    Entonces ve un estado vacío
    Y no ve un error técnico

  @HU-06 @RF-08
  Escenario: Ver detalle de un espacio
    Dado que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Cuando abre el detalle de "Pista sintética de atletismo"
    Entonces ve nombre, tipo, campus, capacidad y reglas de uso

  @HU-06 @RF-08
  Escenario: Detalle de espacio inexistente
    Dado que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Cuando solicita el detalle de un espacio con id inexistente
    Entonces el sistema responde 404 con un mensaje claro

  @HU-07 @RF-09
  Escenario: Staff crea y desactiva un espacio
    Dado que "carlos.staff@udea.edu.co" inició sesión con rol "STAFF"
    Cuando crea el espacio "Coliseo" de tipo "coliseo" en campus "Ciudad Universitaria"
    Entonces el espacio queda activo en el catálogo
    Cuando desactiva el espacio "Coliseo"
    Entonces los estudiantes ya no lo ven en el catálogo
    Y no se aceptan nuevas reservas sobre "Coliseo"

  @HU-07 @RF-09 @HU-04
  Escenario: Estudiante no puede crear espacios
    Dado que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Cuando intenta crear un espacio
    Entonces el sistema responde 403

  @HU-08 @RF-10 @should
  Escenario: Filtrar espacios por campus y tipo
    Dado que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Y que existen espacios de distintos campus y tipos
    Cuando filtra por campus "Ciudad Universitaria" y tipo "pista"
    Entonces solo ve espacios que cumplen ambos filtros
    Cuando el filtro no tiene coincidencias
    Entonces ve un estado vacío
