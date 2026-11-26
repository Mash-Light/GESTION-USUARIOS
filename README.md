# Gestion de usuarios

Aplicacion de prueba tecnica para administrar personas, usuarios, sesiones y permisos con una API REST en Laravel y una SPA en React.

> Estado: base de datos, autenticacion segura y pantalla inicial implementadas. El CRUD, permisos, dashboard e importacion siguen pendientes y se desarrollaran en etapas verificables.

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
- Hecho: pantalla responsive de login y solicitud de recuperacion.
- Pendiente: CRUD de personas/cuentas, desbloqueo administrativo, policies y menu por permisos, filtros/paginacion, importacion CSV/XLSX, dashboard y evidencias finales.

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
