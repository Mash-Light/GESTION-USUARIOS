# Matriz de requisitos y etapas

| Requisito del enunciado | Entrega prevista | Prioridad |
|---|---|---:|
| CRUD personas y usuarios | API y formularios con reglas y restricciones unicas | P0 |
| Email generado con sufijo concurrente | Servicio determinista, `UNIQUE`, reintento de colision | P0 |
| Validacion username, password e identificacion | Form Requests, constraints, pruebas limite | P0 |
| Login por email o username | Auth Sanctum, respuesta generica | P0 |
| Una sesion activa, incluso con login simultaneo | Transaccion, bloqueo de fila, indice unico y prueba concurrente | P0 |
| Auditoria de ingreso, cierre y fallos | Tabla auditada sin secretos | P0 |
| Bloqueo al tercer fallo y desbloqueo admin | contador atomico, Policy, evento administrativo | P0 |
| Expiracion y revocacion de sesion | Middleware y expiracion de servidor | P0 |
| Recuperacion con token limitado y no enumerable | respuesta uniforme, token de un uso y expirable | P1 |
| Roles, propietario y menu por rol en servidor | policies, permisos y endpoint de menu | P0 |
| Migraciones, indices, seeds y funcion almacenada | Laravel migrations/seeders y SQL PostgreSQL | P1 |
| Paginacion, filtros, orden y evitar N+1 | query allowlist, eager loading, EXPLAIN ANALYZE | P1 |
| Frontend login | pantalla con login y recuperacion | P0 |
| Mantenimiento, filtros y paginacion | tabla responsive + permisos de edicion | P0 |
| Importacion CSV/XLSX administrativa | resultado individual por fila e idempotencia | P1 |
| Bienvenida e indicadores dashboard | agregados de servidor y ultima sesion | P1 |
| Pruebas criticas e integracion DB | login, bloqueo, permisos, duplicados y PostgreSQL | P0 |
| README, Linux, evidencias, riesgos y pendientes | instrucciones reproducibles | P0 |

## Secuencia de trabajo

1. Fundacion: fijar versiones, crear Laravel, configurar PostgreSQL, contratos y layout React.
2. Dominio y base de datos: personas, usuarios, roles, constraints, seeders y funcion SQL.
3. Seguridad: login, intentos, bloqueo, sesion unica, auditoria, recuperacion y policies.
4. UI funcional: login, bienvenida, CRUD, filtros/paginacion y menu basado en permisos.
5. Administracion: dashboard y carga masiva por filas.
6. Cierre: pruebas automatizadas, plan de ejecucion, evidencias, guia Linux y commits descriptivos.

## Criterio de terminado por etapa

- Cada flujo tiene contrato API documentado y errores previsibles.
- Reglas de integridad importantes se hacen cumplir en servidor y base de datos.
- Casos criticos tienen prueba automatizada, incluida concurrencia cuando aplique.
- La interfaz cubre carga, error, vacio, accesibilidad basica y expiracion.
- El README permite a otra persona levantar el proyecto sin secretos locales.
