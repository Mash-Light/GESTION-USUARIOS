# Arquitectura y decisiones

## 1. Contexto y limites

Aplicacion de gestion de usuarios con SPA React y API Laravel. El servidor es la autoridad para validar datos, decidir permisos, contar fallos y calcular indicadores. El navegador nunca es una frontera de seguridad.

## 2. Decisiones

### ADR-001: Laravel modular con MVC y servicios de aplicacion

Se usaran modulos por capacidad de negocio (`Auth`, `People`, `Users`, `Access`, `Audit`, `Imports`, `Dashboard`). Controladores HTTP traducen solicitudes y respuestas; Form Requests validan entrada; servicios concentran casos de uso y transacciones; modelos Eloquent representan persistencia; Policies autorizan recursos; Resources fijan el contrato JSON.

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

Cada fila se valida y normaliza primero. La identificacion normalizada funciona como clave de deduplicacion. Se almacenan un lote y resultados por fila, sin guardar el archivo completo mas tiempo del necesario. La persistencia por fila permite reportar exitos y errores individuales; se documentara si el modo seleccionado confirma filas validas aunque otras fallen.

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

React se organiza por funcionalidad: `features/auth`, `features/users`, `features/dashboard`, `features/imports`, `features/navigation`; `shared/api`, `shared/components`, `shared/hooks`. Las rutas requieren sesion, los errores se asocian al control correspondiente y la expiracion de sesion devuelve al login con aviso accesible.

La interfaz sera responsive, semantica y navegable por teclado. Las validaciones muestran mensajes al terminar la interaccion, no antes. Tablas tendran encabezados reales, paginacion de servidor y una presentacion util en moviles. Los criterios de `modern-web-guidance` se consultan antes de cada patron de formulario/tabla.

## 8. Riesgos y pendientes conscientes

- El enunciado no define el comportamiento de email al borrar una cuenta; se mantendra unicidad historica hasta decidir y documentar una politica segura.
- El email de recuperacion requiere un canal de correo. En desarrollo se usara un mailer de log local que nunca se versiona como credencial.
- `EXPLAIN ANALYZE` y el procedimiento/funcion almacenada son especificos de PostgreSQL y se incluiran en scripts.
- El orden de importacion y estrategia ante errores parciales quedara visible al usuario y en documentacion.
- La diferencia de sintaxis entre motores impide prometer portabilidad SQL total; se aisla SQL especifico y se explica como adaptarlo.
