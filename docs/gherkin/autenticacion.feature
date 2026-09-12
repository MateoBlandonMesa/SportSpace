# language: es
@mvp @auth
Característica: Autenticación y control de acceso
  Como miembro de la comunidad UdeA
  quiero registrarme e iniciar sesión en SportSpace
  para usar la plataforma sin depender de Microsoft Entra ID.

  @HU-01 @RF-01 @RF-02
  Escenario: Registro exitoso con correo institucional
    Dado que no existe un usuario con correo "nuevo.estudiante@udea.edu.co"
    Cuando el visitante se registra con correo "nuevo.estudiante@udea.edu.co" y una contraseña válida
    Entonces se crea el usuario con rol "STUDENT"
    Y la contraseña no queda almacenada en texto plano

  @HU-01 @RF-01
  Escenario: Registro rechazado por dominio no institucional
    Cuando el visitante se registra con correo "persona@gmail.com" y una contraseña válida
    Entonces el sistema rechaza el registro con un mensaje claro
    Y no se crea ningún usuario

  @HU-01 @RF-01
  Escenario: Registro rechazado por correo duplicado
    Dado que existe un usuario con correo "ana.estudiante@udea.edu.co"
    Cuando el visitante se registra con correo "ana.estudiante@udea.edu.co" y una contraseña válida
    Entonces el sistema rechaza el registro
    Y el usuario existente no se modifica

  @HU-01 @RF-02
  Esquema del escenario: Registro rechazado por contraseña inválida
    Cuando el visitante se registra con correo "nuevo.estudiante@udea.edu.co" y contraseña "<clave>"
    Entonces el sistema rechaza el registro por política de contraseña

    Ejemplos:
      | clave   |
      | corta1  |
      | sinnumeros |
      | 12345678 |

  @HU-02 @RF-03
  Escenario: Inicio de sesión exitoso
    Dado que existe un usuario "ana.estudiante@udea.edu.co" con rol "STUDENT" y contraseña válida
    Cuando inicia sesión con esas credenciales
    Entonces el sistema emite una sesión JWT
    Y lo redirige a las funciones de estudiante

  @HU-02 @RF-04
  Escenario: Inicio de sesión con credenciales incorrectas
    Dado que existe un usuario "ana.estudiante@udea.edu.co"
    Cuando inicia sesión con correo "ana.estudiante@udea.edu.co" y contraseña "incorrecta"
    Entonces el sistema rechaza el acceso con un error genérico
    Y no revela si el correo está registrado

  @HU-02 @RNF-03
  Escenario: Rate limit ante intentos fallidos repetidos
    Dado que existe un usuario "ana.estudiante@udea.edu.co"
    Cuando se intentan más inicios de sesión fallidos que el umbral configurado
    Entonces el sistema responde 429
    Y no emite sesión

  @HU-03 @RF-05
  Escenario: Cierre de sesión
    Dado que "ana.estudiante@udea.edu.co" tiene una sesión activa
    Cuando cierra sesión
    Entonces una petición posterior a un recurso protegido responde 401

  @HU-04 @RF-06
  Escenario: Estudiante no puede aprobar reservas ni editar espacios
    Dado que "ana.estudiante@udea.edu.co" inició sesión con rol "STUDENT"
    Cuando intenta crear un espacio o aprobar una reserva
    Entonces el sistema responde 403
    Y el front no muestra esas acciones
