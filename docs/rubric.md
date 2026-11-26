# Trazabilidad de la rúbrica

La rúbrica se usa para dirigir el trabajo y elegir qué demostrar. Esta matriz registra evidencia del código; no promete una calificación, que depende de la evaluación de la prueba.

| Criterio | Peso | Evidencia implementada | Pendiente de completar |
|---|---:|---|---|
| Seguridad y concurrencia | 25 | Login por correo/usuario; rate limit; bloqueo al tercer fallo; fila de usuario bloqueada en transacción; sesión activa única; revocación al salir, desactivar, recuperar o cambiar contraseña; respuestas de recuperación indistinguibles para cuentas existentes/no existentes; correo con sufijo y advisory lock PostgreSQL. Pruebas de integración con dos conexiones ejercitan colisión de username, exclusión del generador de correo y serialización de intentos de login. Pruebas HTTP confirman rechazo de sesión expirada y renovación durante actividad. | Para más evidencia, someter los endpoints completos de login y alta a solicitudes concurrentes bajo un servidor multiproceso. |
| Arquitectura y calidad | 20 | Módulos por dominio; Requests, servicios y middleware separados; contrato REST y errores de validación consistentes; auditoría con metadatos permitidos; decisiones y trade-offs documentados. | Revisar con el evaluador cualquier requisito ambiguo del documento. |
| Base de datos y rendimiento | 20 | Migraciones, checks, índices únicos case-insensitive y GIN trigram, relaciones, auditoría, lotes/filas de importación y función SQL de resumen. Benchmark transaccional de 200.000 filas compara antes/después con `EXPLAIN (ANALYZE, BUFFERS)` en `docs/performance.md`. | Repetir con hardware y cardinalidad del despliegue. |
| Frontend | 15 | Login/recuperación con formulario para token, menú autorizado desde BD, tabla adaptable, búsqueda, filtros, orden, paginación, creación/edición, desbloqueo, confirmación de baja, dashboard conectado a PostgreSQL y carga CSV/XLSX con resultados por fila. Recorrido de navegador: gestión a 1440, 1024, 768, 390 y 320 px; dashboard/importación a 390 px; recuperación a 320 px. Sin desbordamiento horizontal ni errores de consola observados. | Validar el recorrido final con los roles y datos que se usarán en la demostración. |
| Pruebas | 10 | Pruebas de login, bloqueo, sesión única, roles, CRUD, filtros, duplicados, bajas, desbloqueo, constraints PostgreSQL, acceso/resumen del dashboard e importaciones CSV/XLSX con idempotencia y permiso, respuesta genérica de recuperación, URL del correo, revocación/desbloqueo al recuperar contraseña, serialización PostgreSQL de login, rechazo de sesión vencida, renovación por actividad y revocación al resembrar cuentas demo. | Ejecutar concurrencia HTTP real bajo un servidor con varios workers y repetir el benchmark en el hardware de destino. |
| Git, Linux y documentación | 10 | `main` estable, `develop` integración y ramas `feature/*`; workflow CI para PHP/PostgreSQL y React; checks requeridos en las ramas protegidas; `.env.example`, guía Linux, README, credenciales sintéticas locales, decisiones y esta matriz. | Repetir benchmark en hardware destino. |

## Comprobaciones locales equivalentes a CI

```powershell
cd backend
php vendor/bin/pint --test
php artisan test

cd ../frontend
npm ci
npm run lint
npm run build
```

El workflow `.github/workflows/ci.yml` ejecuta estas comprobaciones en pull requests con base `develop` o `main`. GitHub tiene protegidas ambas ramas y exige los checks `Laravel and PostgreSQL` y `React build and lint`; la regla aplica a administradores también.
