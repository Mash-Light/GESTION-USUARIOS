# Trazabilidad de la rúbrica

La rúbrica se usa para dirigir el trabajo y elegir qué demostrar. Esta matriz registra evidencia del código; no promete una calificación, que depende de la evaluación de la prueba.

| Criterio | Peso | Evidencia implementada | Pendiente de completar |
|---|---:|---|---|
| Seguridad y concurrencia | 25 | Login por correo/usuario; rate limit; bloqueo al tercer fallo; fila de usuario bloqueada en transacción; sesión activa única; revocación al salir, desactivar o cambiar contraseña; correo con sufijo y advisory lock PostgreSQL. Pruebas de integración con dos conexiones ejercitan colisión de nombre de usuario y exclusión/liberación del lock transaccional. | Probar en paralelo solicitudes completas de login y generación de correo; revisar expiración de sesión en navegador. |
| Arquitectura y calidad | 20 | Módulos por dominio; Requests, servicios y middleware separados; contrato REST y errores de validación consistentes; auditoría con metadatos permitidos; decisiones y trade-offs documentados. | Revisar con el evaluador cualquier requisito ambiguo del documento. |
| Base de datos y rendimiento | 20 | Migraciones, checks, índices únicos case-insensitive y GIN trigram, relaciones, auditoría, lotes/filas de importación y función SQL de resumen. Benchmark transaccional de 200.000 filas compara antes/después con `EXPLAIN (ANALYZE, BUFFERS)` en `docs/performance.md`. | Repetir con hardware y cardinalidad del despliegue. |
| Frontend | 15 | Login/recuperación, menú autorizado desde BD, tabla adaptable, búsqueda, filtros, orden, paginación, creación/edición, desbloqueo, confirmación de baja, dashboard conectado a PostgreSQL y carga CSV/XLSX con resultados por fila. | Recorrido visual final en escritorio y móvil. |
| Pruebas | 10 | Pruebas de login, bloqueo, sesión única, roles, CRUD, filtros, duplicados, bajas, desbloqueo, constraints PostgreSQL, acceso/resumen del dashboard e importaciones CSV/XLSX con idempotencia y permiso. | Añadir prueba concurrente y más casos de recuperación. |
| Git, Linux y documentación | 10 | `main` estable, `develop` integración y rama `feature/*`; workflow CI para PHP/PostgreSQL y React; checks requeridos en las ramas protegidas; `.env.example`, guía Linux, README, decisiones y esta matriz. | Completar evidencia reproducible de rendimiento y recorrido visual final. |

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
