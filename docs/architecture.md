# Arquitectura y decisiones

## 1. Contexto y limites

Aplicacion de gestion de usuarios con SPA React y API Laravel. El servidor es la autoridad para validar datos, decidir permisos, contar fallos y calcular indicadores. El navegador nunca es una frontera de seguridad.

## 2. Decisiones

### ADR-001: Laravel modular con MVC y servicios de aplicacion

La API se divide en modulos por capacidad de negocio (`Auth`, `People`, `Users`, `Access`, `Audit`, `Imports`, `Dashboard`). Controladores HTTP traducen solicitudes y respuestas; Form Requests validan entrada; servicios concentran casos de uso y transacciones; modelos Eloquent representan persistencia; middleware y permisos de dominio autorizan rutas y acciones; Resources fijan el contrato JSON.

Esto mantiene el flujo visible para un desarrollador junior y evita tanto controladores con reglas de negocio como capas de repositorio sin valor adicional. Los servicios no dependen del ciclo HTTP, por lo que se pueden probar directamente.

### ADR-002: PostgreSQL como unico motor de la entrega

El enunciado permite seleccionar MySQL, PostgreSQL o SQL Server y no exige soportar los tres. PostgreSQL facilita constraints, bloqueos y consultas `EXPLAIN ANALYZE`. Migrar a otro motor exigiria revisar sintaxis SQL especifica, tipos booleanos/identidad, funciones y semantica de bloqueo; las reglas comunes se mantienen en migraciones de Laravel y el SQL especifico se aisla y documenta.

### ADR-003: cookie de sesion Sanctum para la SPA

La SPA es cliente de primera parte. Sanctum recomienda autenticacion basada en cookies y sesion para este escenario: conserva proteccion CSRF y evita persistir bearer tokens en `localStorage`. El frontend y backend se configuraran bajo el mismo dominio de nivel superior en un entorno real.

Una tabla `active_sessions` con indice unico por usuario registrara la sesion vigente. El login bloqueara la fila de usuario dentro de una transaccion y verificara la sesion activa antes de regenerar el identificador de sesion. Un middleware comparara la sesion autenticada con el registro vigente; logout, expiracion, bloqueo y revocacion lo invalidaran.

### ADR-004: unicidad y concurrencia pertenecen tambien a la base de datos

Las consultas previas de disponibilidad sirven para mensajes, pero no protegen dos solicitudes simultaneas. Las columnas unicas y las transacciones son la garantia final. La generacion de correo normaliza nombre/apellidos, forma una base determinista y asigna sufijo numerico al resolver colisiones; ante una colision concurrente se reintenta la operacion dentro de un limite.

### ADR-005: auditoria separada de los datos de autenticacion

`audit_events` guardara actor si existe, sujeto afectado, tipo de evento, resultado, fecha y metadatos permitidos. Nunca incluye contrasenas, cookies, tokens de recuperacion ni headers de autorizacion. Los intentos fallidos no revelaran si fallaron por usuario inexistente o contrasena incorrecta en la respuesta publica.

### ADR-006: borrado logico de personas y usuarios

Los registros se conservan con `deleted_at` para mantener referencias y trazabilidad. Las consultas normales excluyen borrados; los indices de unicidad y la politica de reutilizacion de identificadores/correos se implementaran explicitamente para PostgreSQL y quedaran cubiertos por pruebas.

### ADR-007: importacion idempotente con resultado por fila

El archivo se valida por tipo, tamaño, encabezados y número de filas. Cada fila usa las mismas reglas y el mismo servicio de creación que el formulario; la huella SHA-256 junto con el actor evita procesar dos veces el mismo archivo. Una transacción por fila permite conservar las cuentas válidas aunque otra falle. Solo se guardan el lote, el resultado de cada fila y los errores; las contraseñas se hashean por el modelo de usuario y no aparecen en auditoría ni en la respuesta. La carga síncrona se limita a 100 filas para controlar la duración de la petición.

### ADR-008: recuperación de contraseña revoca la sesión anterior

El enlace del correo apunta a la SPA mediante `FRONTEND_URL`, y el token y correo viajan como parámetros de consulta para que el formulario los envíe a la API. La API aplica las mismas reglas de contraseña fuerte que el alta. Al consumir el token, bloquea la fila de usuario, actualiza la contraseña, limpia el bloqueo por intentos fallidos y elimina tanto la sesión activa de dominio como las sesiones persistidas de Laravel. Así, una recuperación confirmada invalida el acceso previo y queda auditada sin registrar el token ni la contraseña.

### ADR-009: el perfil propio tiene un contrato más estrecho que la administración

La bienvenida consume el recurso del usuario autenticado y muestra identidad, fecha del último ingreso e intentos fallidos actuales. La ruta `PATCH /api/profile` solo permite editar nombres y fecha de nacimiento; identificación, username, correo, rol, estado y contraseña no se aceptan ahí. El permiso `profile.update-own` se comprueba en el servidor, y el cambio queda auditado. El administrador gestiona cuentas comunes, pero las rutas de edición, baja y desbloqueo rechazan cualquier cuenta que no tenga exactamente el rol `member`; la interfaz también oculta esas acciones. La restricción del servidor prevalece aunque se invoque la API directamente.

## 3. Modulos del backend

```text
app/Domain/People/       Persona y normalizacion de identificacion
app/Domain/Users/        Cuenta, generador de correo y reglas de usuario
app/Domain/Auth/         Login, bloqueo, sesiones, logout y recuperacion
app/Domain/Access/       Roles, permisos, menu y policies
app/Domain/Audit/        Eventos de seguridad y administracion
app/Domain/Imports/      Lotes, filas y deduplicacion
app/Domain/Dashboard/    Indicadores agregados en el servidor
app/Http/                Controllers, Requests, Resources y middleware
```

La estructura final respetara las convenciones de Laravel si una carpeta adicional no mejora la navegacion.

## 4. Modelo de datos objetivo

- `people`: nombres, apellidos, identificacion, nacimiento y borrado logico.
- `users`: persona (unica), username, email, password hash, estado y contador de fallos.
- `roles`, `permissions`, `role_user`, `permission_role`: acceso y menu derivado de permisos.
- `active_sessions`: una fila vigente por cuenta, huella del identificador de sesion y expiracion.
- `audit_events`: inicios, cierres, fallos, cambios de estado y acciones administrativas.
- `password_reset_tokens`: token de un solo uso con almacenamiento seguro y expiracion.
- `import_batches`, `import_rows`: trazabilidad de carga masiva y errores individuales.

Restricciones: `UNIQUE` para identificacion, username, email, `users.person_id`, `active_sessions.user_id`, y pivotes; `CHECK` para identificacion de diez digitos y estado permitido cuando aplique; indices por estado, fecha, foreign keys y columnas de busqueda/filtro. La regla de cuatro digitos repetidos se valida en entrada y tambien mediante constraint PostgreSQL.

El diagrama de referencia del enunciado se amplifica para cubrir auditoria, permisos, tokens e importaciones. Se incluiran datos sinteticos de demostracion, nunca datos personales reales.

## 5. Flujo de login y bloqueo

1. Recibir `login` y contrasena; aplicar rate limit adicional por IP y hash del login normalizado.
2. Buscar cuenta por email o username sin diferencia de mayusculas.
3. Iniciar transaccion y bloquear la fila del usuario; revisar bloqueo, estado y sesion vigente.
4. En fallo, incrementar consecutivos y registrar resultado; el tercer fallo activa bloqueo en la misma transaccion.
5. En exito, limpiar consecutivos, regenerar sesion, crear su registro activo, registrar el evento y confirmar.
6. Responder con datos publicos y permisos de menu, nunca con hashes o metadatos secretos.

La respuesta no distingue entre cuenta inexistente y clave incorrecta. Para conservar auditoria se registra internamente el intento con un sujeto opcional y metadatos redactados.

## 6. Contrato HTTP previsto

- Exito: JSON con forma estable (`data`, y `meta` para paginacion).
- Error de validacion: `422` con errores por campo.
- No autenticado: `401`; autenticado sin permiso: `403`.
- Recurso inexistente: `404`; conflicto de sesion/unicidad: `409`.
- Rate limit: `429` con `Retry-After`.
- Error inesperado: `500` con identificador de correlacion, sin stack trace en produccion.

La paginacion, filtros y orden se ejecutan en SQL. Los nombres de campos ordenables se limitan a una lista permitida para no interpolar input en identificadores SQL.

## 7. Frontend

React se organiza por funcionalidad: `features/auth`, `features/people`, `features/dashboard`, `features/imports`, `features/workspace`; `shared/api` y `shared/components`. Las vistas protegidas solo se ofrecen al reflejar los permisos recibidos, y la API vuelve a comprobarlos en cada solicitud. Los formularios muestran errores de servidor y las pantallas de administración se adaptan a escritorio y móvil.

La interfaz es responsive, semántica y navegable por teclado. La gestión de personas usa tabla paginada en servidor; la carga permite descargar una plantilla y presenta un resumen con errores por fila. Los campos y componentes evitan dependencias de APIs obsoletas.

## 8. Riesgos y pendientes conscientes

- El enunciado no define el comportamiento de email al borrar una cuenta; se mantendra unicidad historica hasta decidir y documentar una politica segura.
- El email de recuperacion requiere un canal de correo. En desarrollo se usa `MAIL_MAILER=log`; en despliegue configura un proveedor real y `FRONTEND_URL` al origen HTTPS de la SPA.
- `EXPLAIN ANALYZE` y el procedimiento/funcion almacenada son especificos de PostgreSQL y se incluiran en scripts.
- La importación confirma cada fila válida por separado; la pantalla y `docs/imports.md` muestran el estado parcial y los errores que requieren corrección.
- La diferencia de sintaxis entre motores impide prometer portabilidad SQL total; se aisla SQL especifico y se explica como adaptarlo.
