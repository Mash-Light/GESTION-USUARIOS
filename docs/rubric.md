# Trazabilidad de la rúbrica

La rúbrica se usa para dirigir el trabajo y elegir qué demostrar. Esta matriz registra evidencia del código; no promete una calificación, que depende de la evaluación de la prueba.

| Criterio | Peso | Evidencia implementada | Pendiente de completar |
|---|---:|---|---|
| Seguridad y concurrencia | 25 | Login por correo/usuario; rate limit; bloqueo al tercer fallo; fila de usuario bloqueada en transacción; sesión activa única; revocación al salir, desactivar o cambiar contraseña; correo con sufijo y advisory lock PostgreSQL. | Ejercicio automatizado de solicitudes paralelas para login y generación de correo; revisar expiración en navegador. |
| Arquitectura y calidad | 20 | Módulos por dominio; Requests, Resources, servicios y middleware separados; errores de validación; auditoría con metadatos permitidos. | Cerrar contrato API completo, documentar trade-offs y terminar los módulos. |
| Base de datos y rendimiento | 20 | Migraciones, checks, índices de unicidad case-insensitive, relaciones, auditoría, sesiones, importaciones y función SQL de resumen. Búsqueda y paginación se ejecutan en PostgreSQL. | Incorporar índices de búsqueda medidos, adjuntar `EXPLAIN (ANALYZE, BUFFERS)` y documentar plan antes/después. |
| Frontend | 15 | Login/recuperación, menú autorizado desde BD, tabla adaptable, búsqueda, filtros, orden, paginación, creación/edición, desbloqueo y confirmación de baja. | Dashboard e importación CSV/XLSX. |
| Pruebas | 10 | Pruebas de login, bloqueo, sesión única, rol, CRUD, filtros, duplicados, bajas, desbloqueo y constraints PostgreSQL. | Añadir prueba concurrente y más casos de recuperación/autorización. |
| Git, Linux y documentación | 10 | `main` estable, `develop` integración y rama `feature/*`; workflow CI para PHP/PostgreSQL y React; `.env.example`, README, decisiones y esta matriz. | Ejecutar CI desde PR hacia `develop`, exigir los checks en GitHub y completar guía de Linux y evidencias. |

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

El workflow `.github/workflows/ci.yml` ejecuta estas comprobaciones en pull requests con base `develop` o `main`. Para que GitHub impida integrar cuando fallen, hay que activar reglas de protección de ramas y marcar ambos jobs como checks requeridos después de su primera ejecución.
