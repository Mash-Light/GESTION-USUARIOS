# Trazabilidad de la rúbrica

La rúbrica se usa para dirigir el trabajo y elegir qué demostrar. Esta matriz registra evidencia del código; no promete una calificación, que depende de la evaluación de la prueba.

| Criterio | Peso | Evidencia implementada | Pendiente de completar |
|---|---:|---|---|
| Seguridad y concurrencia | 25 | Login por correo/usuario; rate limit; bloqueo al tercer fallo; fila de usuario bloqueada en transacción; sesión activa única; revocación al salir, desactivar, recuperar o cambiar contraseña; respuestas de recuperación indistinguibles para cuentas existentes/no existentes; correo con sufijo y advisory lock PostgreSQL. Pruebas de integración con dos conexiones ejercitan colisión de username, exclusión del generador de correo y serialización de intentos de login. Pruebas HTTP confirman rechazo de sesión expirada y renovación durante actividad. | Para más evidencia, someter los endpoints completos de login y alta a solicitudes concurrentes bajo un servidor multiproceso. |
| Arquitectura y calidad | 20 | Módulos por dominio; Requests, servicios y middleware separados; contrato REST y errores de validación consistentes; auditoría con metadatos permitidos; decisiones y trade-offs documentados. | Revisar con el evaluador cualquier requisito ambiguo del documento. |
| Base de datos y rendimiento | 20 | Migraciones, checks, índices únicos case-insensitive y GIN trigram, relaciones, auditoría, lotes/filas de importación y función SQL de resumen. Benchmark transaccional de 200.000 filas compara antes/después con `EXPLAIN (ANALYZE, BUFFERS)` en `docs/performance.md`. | Repetir con hardware y cardinalidad del despliegue. |
| Frontend | 15 | Login/recuperación con formulario para token, menú autorizado desde BD, tabla adaptable, búsqueda, filtros, orden, paginación, creación/edición, desbloqueo, confirmación de baja, dashboard conectado a PostgreSQL, importación CSV/XLSX por fila y bienvenida editable con acceso, actividad e intentos. Recorrido final de usuarios, dashboard, importación, bienvenida y ruta de recuperación; APIs de lectura en HTTP 200, carga masiva en HTTP 201 con resultado parcial y repetición idempotente en HTTP 409 mostrando el lote anterior; sin desbordamiento horizontal a 390 px. | El enlace real de recuperación fue enviado por SMTP; falta que el destinatario complete ese enlace para confirmar el ciclo manual completo en el navegador. |
| Pruebas | 10 | Último CI de GitHub: 35 pruebas y 200 aserciones; incluye login, bloqueo, sesión única, roles, CRUD, filtros, duplicados, bajas, desbloqueo, constraints PostgreSQL, dashboard, importaciones CSV/XLSX e idempotencia, respuesta genérica de recuperación, URL del correo, recuperación exitosa con revocación/desbloqueo, perfil y protección de administradores, concurrencia PostgreSQL y expiración/renovación de sesión. | Agregar casos automatizados para token vencido, token incorrecto y reutilización después de recuperar; la prueba actual cubre recuperación exitosa y URL, pero no esos rechazos. Ejecutar también concurrencia HTTP real bajo varios workers y repetir benchmark en el hardware destino. |
| Git, Linux y documentación | 10 | `main` estable, `develop` integración y ramas `feature/*`/`fix/*`; PR #8 integrado en `develop`; workflow CI para PHP/PostgreSQL y React con ambos checks exitosos; `.env.example`, guía Linux, README, credenciales sintéticas locales, decisiones y esta matriz. | Repetir benchmark en hardware destino. |

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
