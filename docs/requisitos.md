# SportSpace — Requisitos, historias de usuario, alcance y MVP

| Campo | Valor |
| --- | --- |
| Proyecto | SportSpace |
| Asignatura | Proyecto Integrador I (2508700) — Grupo 6 |
| Institución | Universidad de Antioquia |
| Versión | 1.3 |
| Fecha | 2026-09-12 |
| Estado | Baseline de fase 1 (análisis). Congela el MVP de PI1. |

Este documento traduce el anteproyecto y las decisiones de arquitectura del [README](../README.md) a artefactos verificables: actores, alcance, MVP, historias de usuario (HU), requisitos funcionales (RF), requisitos no funcionales (RNF) y escenarios Gherkin en [gherkin/](gherkin/).

---

## 1. Actores

| Actor | Rol en el sistema | Quién es en la UdeA |
| --- | --- | --- |
| Visitante | No autenticado. Solo ve pantalla de bienvenida, registro y login. | Cualquier persona que abre la app. |
| Estudiante | Rol `STUDENT`. Consulta espacios y disponibilidad, solicita y cancela sus reservas. | Comunidad universitaria con correo `@udea.edu.co`. |
| Staff | Rol `STAFF`. Gestiona espacios, aprueba/rechaza, ve el dashboard de ocupación. | Administración de escenarios / deporte universitario (prototipo). |
| Administrador | Rol `ADMIN`. Todo lo de staff más gestión de usuarios y roles. | Equipo SportSpace / responsable del prototipo. |
| Sistema | Valida solapes, aplica transiciones de estado y escribe auditoría. | Backend + PostgreSQL. |

En PI1 no hay integración con el directorio institucional: el actor se identifica con **login propio** (correo `@udea.edu.co` + contraseña de SportSpace).

---

## 2. Alcance

### 2.1 Dentro de alcance (PI1)

- Aplicación web (SPA + API) para centralizar consulta de disponibilidad y gestión de reservas de espacios deportivos tipo UdeA.
- Autenticación propia, roles `STUDENT` / `STAFF` / `ADMIN`.
- Catálogo de espacios (crear, editar, activar/desactivar).
- Consulta de disponibilidad por espacio y rango de fechas, en tiempo real respecto a las reservas almacenadas.
- Ciclo de reserva: solicitar → pendiente → aprobar o rechazar; cancelar si aún no inicia.
- Prevención de conflictos de horario (validación de aplicación + restricción en base de datos).
- Dashboard de ocupación por espacio y semana (staff/admin).
- Gestión de roles de usuarios desde la aplicación (`ADMIN`).
- Auditoría mínima de cambios de estado.
- Pruebas funcionales, de conflicto y de seguridad básica documentadas (escenarios Gherkin).

### 2.2 Fuera de alcance (PI1)

| Ítem | Motivo |
| --- | --- |
| SSO Microsoft Entra ID / 2FA institucional | La cuenta estudiante no puede registrar apps en el tenant UdeA (401 en Azure). Requiere Gestión Informática. |
| Integración con Portafolio, Sede Electrónica o correo institucional de producción | Dependencia institucional; no es necesaria para demostrar el MVP. |
| Pagos, multas o cobros | El problema es disponibilidad y solicitud, no recaudo. |
| App nativa iOS/Android | El objetivo es plataforma web. |
| Microservicios desplegados por separado | Sobre-ingeniería para tres personas; se usa monolito modular. |
| IoT, sensores o ocupación física en cancha | No hay fuente de datos institucional. |
| Reserva de implementos (balones, redes, etc.) | El anteproyecto se centra en **espacios**. |
| Notificaciones push o SMS | Complejidad y costo ajenos al curso. |
| Calendario exportable (iCal) y reportes analíticos avanzados (más allá del dashboard semanal) | Evolución (PI2). |

### 2.3 Supuestos

1. Los escenarios del prototipo se cargan por semilla o por staff; no se importa un inventario oficial UdeA.
2. Una franja se considera ocupada si existe reserva `PENDING` o `APPROVED` que se solape (evita doble compromiso mientras está en revisión).
3. El horario se maneja en zona `America/Bogota`.
4. Un estudiante puede tener varias reservas, en espacios o horarios distintos, si no violan el solape del mismo espacio.
5. El primer `ADMIN` se crea por semilla de desarrollo; el resto de promociones a `STAFF`/`ADMIN` se hacen en la app (HU-20).

### 2.4 Restricciones

- Equipo de tres estudiantes, 16 semanas, metodología cascada con retroalimentación.
- Stack: React + NestJS + PostgreSQL (ver README).
- Código, API y esquema de base de datos en **inglés**; documentación y copy de UI en español.
- No hay ambiente de producción institucional; el despliegue de evaluación puede ser local o un hosting académico.

---

## 3. MVP (mínimo producto viable)

El MVP de PI1 es la **porción mínima que demuestra el objetivo general**: un usuario de la comunidad consulta disponibilidad en tiempo real y gestiona una solicitud sin que dos reservas ocupen el mismo espacio y horario; staff programa con un dashboard de ocupación y el admin asigna roles sin tocar la base de datos.

### 3.1 Debe poder demostrarse en sustentación

1. Registro e inicio de sesión con `@udea.edu.co`.
2. Un estudiante ve espacios y franjas libres/ocupadas de un día.
3. El estudiante solicita una reserva y la ve en “mis reservas”.
4. Staff/admin aprueba o rechaza con motivo.
5. Una segunda solicitud al mismo espacio y horario se rechaza de forma determinista.
6. Un estudiante no puede aprobar reservas ni editar espacios.
7. Staff/admin ve ocupación por espacio y semana.
8. Un `ADMIN` promociona un usuario a `STAFF` o `ADMIN` desde la aplicación.

### 3.2 HU que entran al MVP

Prioridad **Must**: `HU-01`–`HU-07`, `HU-09`–`HU-16`, `HU-19`, `HU-20`.

`HU-08` (filtros) sigue en **Should**. `HU-17` y `HU-18` siguen en **Could**.

### 3.3 Criterios de salida del MVP

Coinciden con “Cómo se medirá el éxito” del README: consulta coherente, ciclo de solicitud, anti-solape, separación de roles, dashboard semanal, gestión de roles en UI y evidencia de pruebas (Gherkin).

---

## 4. Historias de usuario (HU)

Formato: *Como [actor], quiero [acción] para [beneficio].*

Prioridad MoSCoW: **Must** = MVP · **Should** = deseable en PI1 si hay tiempo · **Could** = evolución · **Won’t** = fuera de alcance (no se listan como HU).

Estimación en puntos (Fibonacci) orientativa para el equipo, no contractual con el curso.

### 4.1 Autenticación y cuenta

#### HU-01 — Registro con correo institucional

**Como** visitante, **quiero** registrarme con correo `@udea.edu.co` y una contraseña, **para** obtener una cuenta en SportSpace sin depender de Microsoft.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Rol | Visitante → Estudiante |
| Puntos | 5 |
| RF | RF-01, RF-02 |
| RNF | RNF-01, RNF-02, RNF-08 |

**Criterios de aceptación**

1. El correo debe terminar en `@udea.edu.co` (mayúsculas/minúsculas no importan).
2. Un correo de otro dominio se rechaza con mensaje claro, sin crear usuario.
3. La contraseña cumple política mínima (longitud y complejidad definidas en RF-02).
4. La contraseña no se almacena en texto plano.
5. El correo es único: un segundo registro con el mismo correo falla.
6. Tras un registro válido, el usuario queda con rol `STUDENT`.

#### HU-02 — Inicio de sesión

**Como** usuario registrado, **quiero** iniciar sesión con correo y contraseña, **para** acceder a las funciones de mi rol.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 5 |
| RF | RF-03, RF-04 |
| RNF | RNF-01, RNF-03, RNF-08 |

**Criterios de aceptación**

1. Credenciales correctas emiten sesión (JWT) y redirigen según el rol.
2. Credenciales incorrectas muestran error genérico (no revelar si el correo existe).
3. Tras N intentos fallidos en ventana corta, se aplica rate limit (RNF-03).
4. Un token vencido obliga a volver a autenticarse.

#### HU-03 — Cierre de sesión

**Como** usuario autenticado, **quiero** cerrar sesión, **para** que nadie más use mi cuenta en ese navegador.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 2 |
| RF | RF-05 |

**Criterios de aceptación**

1. Al cerrar sesión se invalida o elimina el token de refresco en el cliente.
2. Una petición posterior a un endpoint protegido responde 401.

#### HU-04 — Control de acceso por rol

**Como** administrador del sistema, **quiero** que cada rol solo ejecute sus acciones, **para** que un estudiante no gestione el catálogo ni apruebe reservas.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 5 |
| RF | RF-06 |
| RNF | RNF-01 |

**Criterios de aceptación**

1. `STUDENT` no accede a endpoints de crear/editar espacios ni de aprobar/rechazar.
2. `STAFF` y `ADMIN` sí pueden gestionar espacios y solicitudes.
3. El front oculta acciones no autorizadas; el backend las rechaza igual (403).

### 4.2 Espacios

#### HU-05 — Consultar catálogo de espacios

**Como** estudiante, **quiero** ver los espacios deportivos activos, **para** elegir dónde reservar.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 3 |
| RF | RF-07, RF-08 |

**Criterios de aceptación**

1. Se listan solo espacios `activo = true`.
2. Cada ítem muestra al menos: nombre, tipo, campus y una descripción corta.
3. Si no hay espacios, se muestra estado vacío (no error técnico).
4. Visitante no autenticado no ve el catálogo (debe iniciar sesión).

#### HU-06 — Ver detalle de un espacio

**Como** estudiante, **quiero** ver el detalle de un espacio, **para** conocer reglas de uso y capacidad antes de solicitar.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 2 |
| RF | RF-08 |

**Criterios de aceptación**

1. El detalle incluye nombre, tipo, campus, capacidad, reglas de uso y estado.
2. Un id inexistente responde 404 con mensaje claro.

#### HU-07 — Gestionar espacios (staff/admin)

**Como** staff, **quiero** crear, editar y desactivar espacios, **para** mantener el catálogo del prototipo.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 8 |
| RF | RF-09 |
| RNF | RNF-01 |

**Criterios de aceptación**

1. Staff/admin crea un espacio con nombre, tipo, campus, capacidad y reglas.
2. Puede editar esos campos y desactivar el espacio (deja de aparecer en el catálogo estudiantil).
3. Un espacio desactivado no admite nuevas reservas.
4. Estudiante que intente crear/editar recibe 403.

#### HU-08 — Filtrar espacios

**Como** estudiante, **quiero** filtrar por campus y tipo, **para** encontrar más rápido el escenario.

| Campo | Valor |
| --- | --- |
| Prioridad | Should |
| Puntos | 3 |
| RF | RF-10 |

**Criterios de aceptación**

1. Filtros combinables: campus, tipo (cancha, pista, coliseo, etc.).
2. Sin coincidencias → estado vacío.
3. Si no se implementa en PI1, el catálogo completo sigue cumpliendo HU-05.

### 4.3 Disponibilidad

#### HU-09 — Consultar disponibilidad en tiempo real

**Como** estudiante, **quiero** ver, para un espacio y una fecha, qué franjas están libres u ocupadas, **para** solicitar solo horarios posibles.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 8 |
| RF | RF-11, RF-12 |
| RNF | RNF-04, RNF-05 |

**Criterios de aceptación**

1. Dado un `spaceId` y una fecha, el sistema calcula franjas según reglas de horario del espacio.
2. Una franja con reserva `PENDING` o `APPROVED` se muestra ocupada.
3. Una franja sin esas reservas se muestra libre.
4. Tras crear o aprobar una reserva, una nueva consulta refleja el cambio sin recargar datos viejos como verdad (tiempo real respecto a la BD).
5. Fechas pasadas no ofrecen franjas reservables.

#### HU-10 — Definir horarios y bloqueos (staff)

**Como** staff, **quiero** definir horarios habilitados y bloqueos (mantenimiento, evento), **para** que la disponibilidad no ofrezca franjas imposibles.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 8 |
| RF | RF-13 |

**Criterios de aceptación**

1. Staff asigna días/horas de operación a un espacio (p. ej. lun–vie 06:00–22:00).
2. Staff puede bloquear un intervalo (el calendario lo muestra no disponible).
3. El motor de HU-09 resta bloqueos y reservas.

### 4.4 Reservas

#### HU-11 — Solicitar reserva

**Como** estudiante, **quiero** solicitar un espacio en un horario libre, **para** dejar constancia de mi pedido.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 8 |
| RF | RF-14, RF-15, RF-16 |
| RNF | RNF-05, RNF-06 |

**Criterios de aceptación**

1. Solo se puede solicitar una franja mostrada como libre.
2. La reserva nace en estado `PENDING`.
3. Queda asociada al usuario autenticado y al espacio.
4. Si el horario ya no está libre (otra solicitud ganó la carrera), se rechaza con mensaje de conflicto; no se crea.
5. No se permiten intervalos invertidos (`fin <= inicio`) ni fechas pasadas.

#### HU-12 — Evitar conflictos de horario

**Como** sistema, **quiero** impedir dos reservas `PENDING` o `APPROVED` que se solapen en el mismo espacio, **para** no sobreasignar el escenario.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 8 |
| RF | RF-16 |
| RNF | RNF-05, RNF-06 |

**Criterios de aceptación**

1. La API valida solape antes de insertar.
2. PostgreSQL rechaza el solape con restricción de exclusión aunque dos peticiones lleguen a la vez.
3. El usuario recibe un error entendible (no un 500 de BD).
4. Prueba documentada: dos `POST` simultáneos al mismo espacio/horario → a lo sumo una reserva válida.

#### HU-13 — Ver mis reservas

**Como** estudiante, **quiero** listar mis solicitudes y su estado, **para** saber si fueron aprobadas, rechazadas o siguen pendientes.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 3 |
| RF | RF-17 |

**Criterios de aceptación**

1. Solo ve las reservas propias.
2. Cada ítem muestra espacio, intervalo, estado y motivo si fue rechazada.
3. Listado paginado o acotado (RNF-04).

#### HU-14 — Cancelar mi reserva

**Como** estudiante, **quiero** cancelar una reserva mía que aún no inicia, **para** liberar el espacio.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 3 |
| RF | RF-18 |

**Criterios de aceptación**

1. Puede cancelar `PENDING` o `APPROVED` si `starts_at` es futuro.
2. Pasa a `CANCELLED` y deja de ocupar la franja.
3. No puede cancelar reservas de otros (403).
4. No puede cancelar si el horario ya inició o el estado es `REJECTED`.

#### HU-15 — Aprobar o rechazar solicitudes

**Como** staff, **quiero** aprobar o rechazar una reserva pendiente indicando un motivo, **para** confirmar el uso del espacio.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 5 |
| RF | RF-19, RF-20 |
| RNF | RNF-07 |

**Criterios de aceptación**

1. Staff/admin ve la bandeja de `PENDING`.
2. Aprobar pasa a `APPROVED`; rechazar pasa a `REJECTED` y exige motivo no vacío.
3. Estudiante no puede ejecutar estas acciones (403).
4. Cada cambio queda en auditoría (quién, cuándo, estado anterior → nuevo).

#### HU-16 — Transiciones de estado válidas

**Como** sistema, **quiero** aceptar solo transiciones legales de una reserva, **para** no corromper el flujo.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 3 |
| RF | RF-20 |

**Criterios de aceptación** — máquina de estados:

```
PENDING  → APPROVED | REJECTED | CANCELLED
APPROVED → CANCELLED
REJECTED → (terminal)
CANCELLED → (terminal)
```

Cualquier otra transición responde 409.

### 4.5 Administración (MVP)

#### HU-19 — Dashboard de ocupación

**Como** staff, **quiero** ver ocupación por espacio y semana, **para** tomar decisiones de programación.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 8 |
| RF | RF-22 |
| RNF | RNF-04, RNF-08 |

**Criterios de aceptación**

1. `STAFF` y `ADMIN` acceden al dashboard; `STUDENT` recibe 403.
2. Se elige una semana (lunes–domingo, zona `America/Bogota`) y se listan los espacios.
3. Por cada espacio se muestra ocupación de esa semana: horas (o franjas) ocupadas por reservas `PENDING` ∪ `APPROVED` frente a horas habilitadas; `CANCELLED` y `REJECTED` no cuentan.
4. Los bloqueos de mantenimiento restan de las horas habilitadas (no se ofrecen ni se cuentan como “reservadas por usuarios”).
5. Semana sin reservas muestra ocupación 0 % (no error).
6. Se puede filtrar el dashboard a un espacio concreto.
7. Los datos coinciden con el motor de disponibilidad (misma fuente de verdad).

#### HU-20 — Gestionar roles de usuarios

**Como** administrador, **quiero** promover un usuario a `STAFF` o `ADMIN`, **para** operar el prototipo sin tocar la base a mano.

| Campo | Valor |
| --- | --- |
| Prioridad | Must |
| Puntos | 5 |
| RF | RF-21 |
| RNF | RNF-01, RNF-07 |

**Criterios de aceptación**

1. Solo `ADMIN` lista usuarios (correo, nombre, rol) y cambia el rol a `STUDENT`, `STAFF` o `ADMIN`.
2. `STAFF` y `STUDENT` que intenten cambiar roles reciben 403.
3. El cambio aplica de inmediato en las siguientes peticiones (el JWT o la consulta de rol refleja el nuevo valor).
4. No se puede dejar el sistema sin ningún `ADMIN` (rechazar degradar al último administrador).
5. El cambio de rol queda en auditoría.

### 4.6 Fuera del MVP (Could)

#### HU-17 — Recuperar contraseña

**Como** usuario, **quiero** restablecer mi contraseña de SportSpace, **para** no perder acceso.

| Prioridad | Could | RF | — | Nota | En PI1 el admin recrea cuentas de prueba. |

#### HU-18 — Notificar por correo el cambio de estado

**Como** estudiante, **quiero** un correo cuando aprueben o rechacen mi reserva, **para** no tener que entrar a mirar.

| Prioridad | Could | Nota | El estado se consulta en la app. |

Escenarios Gherkin de las HU Must: [gherkin/](gherkin/).

---

## 5. Requisitos funcionales (RF)

| ID | Requisito | HU | Prioridad |
| --- | --- | --- | --- |
| RF-01 | El sistema debe permitir el registro de usuarios cuyo correo pertenezca exclusivamente al dominio `udea.edu.co`. | HU-01 | Must |
| RF-02 | El sistema debe exigir contraseña de al menos 8 caracteres, con letra y número, y almacenarla con Argon2id. | HU-01 | Must |
| RF-03 | El sistema debe autenticar con correo y contraseña y emitir un JWT de acceso de corta vida más un refresh token. | HU-02 | Must |
| RF-04 | El sistema no debe revelar si un correo está registrado en mensajes de login fallido. | HU-02 | Must |
| RF-05 | El sistema debe permitir cerrar sesión e invalidar la sesión del cliente. | HU-03 | Must |
| RF-06 | El sistema debe autorizar cada operación según el rol (`STUDENT`, `STAFF`, `ADMIN`). | HU-04 | Must |
| RF-07 | El sistema debe listar espacios activos a usuarios autenticados. | HU-05 | Must |
| RF-08 | El sistema debe mostrar el detalle de un espacio (nombre, tipo, campus, capacidad, reglas). | HU-05, HU-06 | Must |
| RF-09 | El sistema debe permitir a `STAFF` y `ADMIN` crear, editar y desactivar espacios. | HU-07 | Must |
| RF-10 | El sistema debe permitir filtrar espacios por campus y tipo. | HU-08 | Should |
| RF-11 | El sistema debe calcular la disponibilidad de un espacio para una fecha a partir de reglas de horario, bloqueos y reservas `PENDING`/`APPROVED`. | HU-09 | Must |
| RF-12 | El sistema no debe ofrecer franjas en fechas u horas ya transcurridas. | HU-09 | Must |
| RF-13 | El sistema debe permitir a staff definir horarios de operación y bloqueos por espacio. | HU-10 | Must |
| RF-14 | El sistema debe permitir a un `STUDENT` crear una reserva en franja libre, en estado `PENDING`. | HU-11 | Must |
| RF-15 | El sistema debe validar intervalo (`inicio < fin`), espacio activo y pertenencia del usuario autenticado. | HU-11 | Must |
| RF-16 | El sistema debe impedir solapes de reservas `PENDING` o `APPROVED` sobre el mismo espacio, en aplicación y en PostgreSQL. | HU-11, HU-12 | Must |
| RF-17 | El sistema debe listar al estudiante únicamente sus reservas, con estado y motivo de rechazo si aplica. | HU-13 | Must |
| RF-18 | El sistema debe permitir cancelar una reserva propia futura `PENDING` o `APPROVED`, pasando a `CANCELLED` y liberando la franja. | HU-14 | Must |
| RF-19 | El sistema debe permitir a staff/admin aprobar o rechazar `PENDING`; el rechazo exige motivo. | HU-15 | Must |
| RF-20 | El sistema debe aplicar únicamente las transiciones de estado definidas en HU-16 y registrarlas en auditoría. | HU-15, HU-16 | Must |
| RF-21 | El sistema debe permitir a `ADMIN` listar usuarios y cambiar su rol (`STUDENT`, `STAFF`, `ADMIN`), sin dejar el sistema sin administradores. | HU-20 | Must |
| RF-22 | El sistema debe mostrar a `STAFF` y `ADMIN` un dashboard de ocupación por espacio y semana, calculado con reservas `PENDING` y `APPROVED`. | HU-19 | Must |

---

## 6. Requisitos no funcionales (RNF)

Categorías: seguridad, eficiencia, integridad, usabilidad, mantenibilidad, portabilidad.

| ID | Categoría | Requisito | Métrica / evidencia | HU / RF ligados |
| --- | --- | --- | --- | --- |
| RNF-01 | Seguridad | Toda operación de negocio (salvo registro/login) exige JWT válido y verificación de rol en el servidor. | Pruebas 401/403. | HU-04, RF-06 |
| RNF-02 | Seguridad | Contraseñas con Argon2id; secretos solo en variables de entorno; nunca en Git. | Revisión de código + `.gitignore`. | HU-01, RF-02 |
| RNF-03 | Seguridad | Rate limiting en login y en creación de reservas. | Tras umbral configurable, HTTP 429. | HU-02, HU-11 |
| RNF-04 | Eficiencia | Consulta de disponibilidad de un espacio/día y del dashboard semanal en consultas acotadas (sin N+1); listados paginados. | Tiempo de respuesta objetivo &lt; 2 s en entorno local con semilla de prueba. | HU-09, HU-13, HU-19 |
| RNF-05 | Integridad | Consistencia transaccional ACID; restricción de exclusión de solapes en PostgreSQL. | Prueba de condición de carrera documentada. | HU-12, RF-16 |
| RNF-06 | Fiabilidad | Un fallo de validación de negocio no deja reserva a medias; respuesta de error clara. | Casos de prueba de intervalo inválido y espacio inactivo. | HU-11 |
| RNF-07 | Auditoría | Cambios de estado de reserva y de rol de usuario registran actor, timestamp, valor origen y destino. | Inspección de `AuditLog` en pruebas HU-15 y HU-20. | HU-15, HU-20, RF-20, RF-21 |
| RNF-08 | Usabilidad | Interfaz en español; mensajes de error accionables; estados de carga, vacío y error. | Recorrido E2E del MVP (Gherkin). | HU-01–HU-16, HU-19, HU-20 |
| RNF-09 | Usabilidad | La app debe usarse en escritorio (ancho ≥ 1024 px) como prioridad; móvil web básico es deseable. | Verificación visual en fase 5. | — |
| RNF-10 | Seguridad | HTTPS fuera de local; Helmet; CORS restringido al origen del front. | Configuración de despliegue / revisión. | — |
| RNF-11 | Mantenibilidad | TypeScript en front y back; módulos `users`, `spaces`, `reservations`; Prisma versionado. | Estructura del repo. | Arquitectura README |
| RNF-12 | Portabilidad | Entorno reproducible con Docker Compose (PostgreSQL + API + web). | `docker compose up` documentado. | Fase 2 |
| RNF-13 | Compatibilidad | Navegadores actuales: Chrome/Edge/Firefox últimas dos versiones. | Prueba manual fase 5. | — |
| RNF-14 | Legal / datos | En PI1 solo se almacenan nombre, correo institucional y datos de reserva del prototipo; no se reutilizan para otros fines. | Modelo de datos. | HU-01 |
| RNF-15 | Disponibilidad | No se exige SLA institucional. El prototipo debe poder demostrarse en sustentación (ambiente local o hosting del equipo). | Checklist de demo. | Fase 6 |

**No son RNF de PI1:** alta disponibilidad multi-región, autoscaling, SSO corporativo, cifrado de disco institucional.

---

## 7. Trazabilidad

| Objetivo específico (anteproyecto) | HU | RF | RNF |
| --- | --- | --- | --- |
| 1. Analizar el proceso actual (actores, requisitos) | Este documento | Este documento | — |
| 2. Diseñar arquitectura modular con consistencia transaccional | — | RF-16, RF-20 | RNF-05, RNF-11, RNF-12 |
| 3. Implementar consulta de disponibilidad y solicitudes | HU-05, HU-09, HU-11, HU-13 | RF-07, RF-11, RF-14, RF-17 | RNF-04, RNF-08 |
| 4. Evitar conflictos de horario | HU-12 | RF-16 | RNF-05 |
| 5. Evaluar con pruebas | HU-12, HU-04; ver [gherkin/](gherkin/) | Todos Must | RNF-01, RNF-05, RNF-08 |

### Cobertura del MVP

| HU Must | Cubierta por RF | Lista para implementación |
| --- | --- | --- |
| HU-01 … HU-07, HU-09 … HU-16 | RF-01 … RF-09, RF-11 … RF-20 | Sí |
| HU-19 | RF-22 | Sí |
| HU-20 | RF-21 | Sí |
| HU-08 | RF-10 | Should (no bloquea demo) |

---

## 8. Reglas de negocio resumidas

1. Dominio de correo de registro: solo `@udea.edu.co`.
2. Rol por defecto al registrarse: `STUDENT`.
3. Ocupación = unión de reservas `PENDING` ∪ `APPROVED` del espacio.
4. `CANCELLED` y `REJECTED` no ocupan franja.
5. Espacio inactivo: visible solo para staff; no admite reservas nuevas.
6. Zona horaria: `America/Bogota`.
7. Duración de una reserva: intervalo `[inicio, fin)` con `fin > inicio`.
8. Staff puede bloquear franjas; el bloqueo gana sobre la solicitud nueva.
9. Ocupación del dashboard = reservas `PENDING` ∪ `APPROVED` en la semana; no incluye `CANCELLED` ni `REJECTED`.
10. Debe existir al menos un usuario `ADMIN` en todo momento.

---

## 9. Glosario

| Término | Definición |
| --- | --- |
| Franja | Intervalo de tiempo reservable de un espacio. |
| Disponibilidad en tiempo real | Cálculo contra el estado actual de la base de datos, no contra un archivo estático. |
| Solape | Dos intervalos `[a,b)` y `[c,d)` se solapan si `a < d` y `c < b`. |
| Login propio | Autenticación implementada por SportSpace, distinta del login Microsoft UdeA. |
| MVP | Mínimo producto viable de PI1 (sección 3). |
| HU | Historia de usuario. |
| RF | Requisito funcional. |
| RNF | Requisito no funcional (seguridad, rendimiento, usabilidad, etc.). |
| Gherkin | Lenguaje de escenarios Dado/Cuando/Entonces usado en las pruebas de aceptación. |

---

## 10. Escenarios Gherkin

Los escenarios de prueba de aceptación del MVP están en [`docs/gherkin/`](gherkin/), en español (`# language: es`), etiquetados por HU.

| Archivo | HU |
| --- | --- |
| [autenticacion.feature](gherkin/autenticacion.feature) | HU-01 a HU-04 |
| [espacios.feature](gherkin/espacios.feature) | HU-05 a HU-08 |
| [disponibilidad.feature](gherkin/disponibilidad.feature) | HU-09, HU-10 |
| [reservas.feature](gherkin/reservas.feature) | HU-11 a HU-16 |
| [administracion.feature](gherkin/administracion.feature) | HU-19, HU-20 |

En fase 5 se automatizan (p. ej. Jest/Playwright) usando estos escenarios como especificación; no se reescriben criterios en paralelo.

---

## 11. Control de cambios

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0 | 2026-09-12 | Baseline: alcance, MVP, HU-01–HU-20, RF-01–RF-21, requisitos no funcionales 01–15. |
| 1.1 | 2026-09-12 | Sigla unificada a **RNF** (antes se usó RNO por error). README alineado. |
| 1.2 | 2026-09-12 | HU-19 y HU-20 pasan a Must (MVP). Se agrega RF-22 y escenarios Gherkin. |
| 1.3 | 2026-09-12 | Convención de idioma: docs en español; código y base de datos en inglés. |
