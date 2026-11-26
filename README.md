# Gestion de usuarios

Aplicacion de prueba tecnica para administrar personas, usuarios, sesiones y permisos con una API REST en Laravel y una SPA en React.

> Estado: autenticacion segura, gestion de personas/cuentas, dashboard e importacion CSV/XLSX implementados. La evidencia de rendimiento está documentada para la base de demostracion; se recomienda ampliar la medicion con un volumen representativo.

## Objetivos de la prueba

- Gestionar personas y sus cuentas con reglas de identificacion, usuario y correo.
- Autenticar por correo o usuario, mantener una sola sesion activa y auditar eventos.
- Aplicar roles y propiedad del recurso en el servidor.
- Ofrecer login, recuperacion, CRUD paginado, importacion administrativa, bienvenida y dashboard.
- Entregar migraciones, restricciones, indices, funcion SQL, pruebas, evidencia y comandos reproducibles.

## Stack propuesto

- PHP 8.3+ y Laravel 13 para la API.
- PostgreSQL para persistencia, restricciones y transacciones.
- React 19 con Vite para la SPA.
- Laravel Sanctum con cookies de sesion y proteccion CSRF para la SPA de primera parte.

La version concreta de cada dependencia quedara fijada en los lockfiles. PostgreSQL se elige porque permite transacciones, bloqueos de fila, restricciones y un plan `EXPLAIN ANALYZE` demostrable. La prueba permite escoger un solo motor.

## Estructura

```text
backend/       API Laravel, reglas de negocio y persistencia
frontend/      SPA React por funcionalidades
database/      scripts SQL de soporte y consultas de rendimiento
docs/          arquitectura, decisiones, contrato y matriz de requisitos
```

## Requisitos locales

- PHP 8.3 o superior con extensiones de Laravel y PDO PostgreSQL.
- Composer 2.
- Node.js 22 o superior y npm.
- PostgreSQL 15 o superior.

No se deben compartir archivos `.env` ni credenciales reales. Para levantarlo en un equipo de desarrollo:

1. Crear una base PostgreSQL y configurar sus datos en `backend/.env` a partir de `backend/.env.example`.
2. Instalar las dependencias del backend con `composer install` dentro de `backend` y generar una clave con `php artisan key:generate`.
3. Instalar el frontend con `npm install` dentro de `frontend`.
4. Ejecutar las migraciones y datos de demostracion con `php artisan migrate --seed` desde `backend`.
5. En una terminal, ejecutar `php artisan serve --host=127.0.0.1` dentro de `backend`.
6. En otra terminal, ejecutar `npm run dev -- --host 127.0.0.1` dentro de `frontend` y abrir la URL que Vite muestre.

Las pruebas automatizadas requieren una base separada configurada como `users_app_test`; nunca apuntes esa variable a una base con datos que quieras conservar. Ejecuta `php artisan test` dentro de `backend`.

## Estado de implementacion

- Hecho: migraciones PostgreSQL para personas, usuarios, roles, permisos, sesiones, auditoria e importaciones; restricciones e indices; datos sinteticos de demostracion.
- Hecho: login por usuario/correo, contador y bloqueo al tercer fallo, sesion unica, logout, middleware de sesion y endpoints de recuperacion.
- Hecho: pantalla responsive de login, recuperacion, gestion de personas/cuentas y carga CSV/XLSX con busqueda, filtros, orden, paginacion, bloqueo administrativo, baja logica y reporte por fila.
- Hecho: middleware de permisos y menu leido desde la base de datos; auditoria para altas, cambios, bajas y desbloqueos.
- Hecho: dashboard autorizado por permiso, con resumen de cuentas, sesiones, intentos fallidos y actividad reciente; los indicadores principales los calcula una funcion SQL de PostgreSQL.
- Hecho: índices GIN trigram para búsqueda parcial y procedimiento reproducible `EXPLAIN ANALYZE`; la medición del conjunto pequeño de demostración está en `docs/performance.md`.
- Pendiente: repetir la medición de rendimiento con un volumen representativo mayor y recoger evidencia visual final.

## Ramas y verificacion antes de integrar

- `main` conserva la version estable entregada.
- `develop` es la rama de integracion.
- Las nuevas tareas parten de `develop` en ramas `feature/*` o `fix/*` y se proponen con pull request hacia `develop`.
- La integracion de `develop` a `main` se hace en otro pull request cuando la version este lista.
- `.github/workflows/ci.yml` ejecuta en pull requests hacia `develop` y `main`: formato PHP con Pint, pruebas Laravel/PostgreSQL y lint/build de React.
- GitHub protege `develop` y `main`: exige pull request y ambos checks aprobados, requiere que la rama de destino este actualizada y aplica la regla tambien a administradores. Las ramas no permiten borrado ni force push.

La pull request activa de esta etapa apunta a `develop`; no integres cambios de una rama feature directamente a `main`.

### Preparacion en Linux

Instala PHP 8.3+ con extensiones `pdo_pgsql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `curl`, `fileinfo`, `gd` y `zip`; Composer 2; Node.js 22+ con npm; y PostgreSQL 15+. Para cargas de hasta 10 MB, configura `upload_max_filesize=10M` y `post_max_size=12M` en `php.ini`.

```bash
git clone https://github.com/Mash-Light/GESTION-USUARIOS.git
cd GESTION-USUARIOS
git switch develop
cp backend/.env.example backend/.env
cd backend
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1
```

En otra terminal:

```bash
cd GESTION-USUARIOS/frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Antes de migrar, crea la base PostgreSQL `users_app` y configura `DB_*` en `backend/.env`. Para correr pruebas, crea una base aislada `users_app_test` y ejecuta `php artisan test` desde `backend`; usa `npm run lint && npm run build` desde `frontend`. No apuntes las pruebas a una base con datos que quieras conservar.

Las contrasenas de demostracion solo se documentaran cuando el flujo de acceso este terminado; deben cambiarse en cualquier entorno compartido.

## Seguridad prevista

- Hash de contrasena usando el hasher de Laravel; nunca registrar contrasenas ni tokens.
- Restricciones unicas en la base de datos para correo, nombre de usuario, identificacion y relacion persona-cuenta.
- Transacciones y bloqueo de fila para serializar intentos de login y creacion de sesion unica.
- Cookies `HttpOnly`, `Secure` en despliegue y `SameSite`; proteccion CSRF de Sanctum.
- Respuesta uniforme de recuperacion para impedir enumeracion de cuentas.
- Autorizacion mediante Policies en cada accion; React solo refleja permisos, no los concede.
- Registro de auditoria con resultado, actor, fecha y metadatos permitidos; secretos excluidos.

## Documentacion

- [Arquitectura y decisiones](docs/architecture.md)
- [Matriz de requisitos y etapas](docs/requirements.md)
- [Trazabilidad de la rúbrica de 100 puntos](docs/rubric.md)
- [Medición y plan de búsqueda PostgreSQL](docs/performance.md)
- [Formato, validación y seguridad de la importación](docs/imports.md)
