# Guia de entrega y prueba

Esta guia permite instalar, ejecutar y revisar el proyecto en un entorno Linux limpio. La rama de integracion actual es `develop`; `main` se reserva para una version estable. La aplicacion usa PostgreSQL como motor elegido para la entrega.

## Contenido entregado

- `backend/`: API Laravel, reglas de dominio, migraciones, seeders, pruebas y herramientas de rendimiento.
- `frontend/`: cliente React con TypeScript y Tailwind.
- `backend/database/performance/`: consultas y scripts SQL para revisar la busqueda y repetir el benchmark.
- `docs/`: arquitectura, requisitos, rubrica, rendimiento, importaciones y esta guia.
- `.github/workflows/ci.yml`: verificacion automatica de Laravel/PostgreSQL y React en `develop` y `main`.
- `backend/.env.example`: plantilla sin credenciales reales.

## Requisitos

- Linux; PHP 8.3 o superior con `pdo_pgsql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `curl`, `fileinfo`, `gd` y `zip`.
- Composer 2, Node.js 22 con npm y PostgreSQL 15 o superior.
- Para recibir recuperaciones por correo, credenciales SMTP propias. En desarrollo, la configuracion predeterminada escribe los mensajes en el log.

## Instalacion desde cero

Los comandos siguientes suponen que PostgreSQL ya esta instalado y que el usuario de base de datos puede crear la base `users_app` y conectarse a ella.

```bash
git clone https://github.com/Mash-Light/GESTION-USUARIOS.git
cd GESTION-USUARIOS
git switch develop
createdb -h 127.0.0.1 -U postgres users_app
cp backend/.env.example backend/.env
```

Edita `backend/.env` y configura `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` y `DB_PASSWORD` para tu PostgreSQL local. Genera una clave de aplicacion, instala dependencias, migra y carga los datos sinteticos:

```bash
cd backend
composer install --no-interaction --prefer-dist
php artisan key:generate
php artisan migrate --seed
```

En una terminal, inicia la API:

```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

En otra terminal, inicia el frontend:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Abre `http://127.0.0.1:5174`. Vite reenvia las solicitudes `/api` a la API local configurada en `frontend/vite.config.ts`.

## Cuentas sinteticas de demostracion

En `local` y `testing`, `php artisan migrate --seed` crea estas cuentas. Son datos publicos y unicamente para una base local nueva; no reutilices estas claves fuera de una demostracion aislada.

| Rol | Usuario | Clave local |
|---|---|---|
| Administrador | `Admin001` | `AdminDemo2026!` |
| Miembro | `Usuario1` | `UsuarioDemo2026!` |

La clave satisface las reglas del formulario. El seeder tambien limpia sesiones previas de estas cuentas al ejecutarse. El alta normal genera el correo a partir del nombre y apellidos; no solicita un correo.

## Recorrido sugerido para evaluar

1. Inicia sesion como `Admin001`; comprueba los indicadores del dashboard y que el menu corresponde al rol.
2. En **Usuarios**, revisa la tabla paginada, busqueda y filtros; crea una cuenta, edita los datos permitidos y prueba el desbloqueo administrativo.
3. En **Carga masiva**, descarga la plantilla y sube un CSV/XLSX de prueba con una fila valida y otra duplicada. Revisa el resultado individual de cada fila y vuelve a enviar el mismo archivo para comprobar la idempotencia (el segundo envio informa del lote previo).
4. Cierra sesion e inicia como `Usuario1`; comprueba bienvenida, ultimo acceso, intentos fallidos y edicion de perfil permitida.
5. Solicita recuperar la clave de una cuenta cuyo correo generado puedas recibir. La respuesta debe ser equivalente exista o no la cuenta. Sigue el enlace antes de que expire; el token dura 60 minutos y se consume una sola vez. Con `MAIL_MAILER=log`, encuentra el mensaje en `backend/storage/logs/laravel.log`.
6. Comprueba sesion unica iniciando con la misma cuenta en otra sesion del navegador y verifica el rechazo esperado.

No uses una cuenta con sesion activa para validar un nuevo login: cierra sesion primero o usa una cuenta de demostracion diferente. La cuenta de administrador sirve para la vista administrativa; `Usuario1` sirve para revisar la experiencia de miembro.

## SMTP para correo real

Configura estas variables en `backend/.env`; los valores dependen del proveedor SMTP. No guardes ese archivo en Git ni pegues claves de correo en incidencias o capturas.

```dotenv
FRONTEND_URL=http://127.0.0.1:5174
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=usuario-smtp
MAIL_PASSWORD=credencial-smtp
MAIL_FROM_ADDRESS=cuenta@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

Para probar el enlace desde un dispositivo externo, `FRONTEND_URL` debe ser el origen HTTPS publico del frontend y Sanctum/cookies deben quedar configurados para ese origen. Los enlaces temporales de tunel pueden expirar; solicita un correo nuevo si el enlace ya no abre.

## Pruebas automatizadas

Las pruebas de Laravel apuntan a la base aislada `users_app_test`, definida en `backend/phpunit.xml`. Crea esa base antes de ejecutarlas: la suite migra y modifica sus tablas.

```bash
createdb -h 127.0.0.1 -U postgres users_app_test
cd backend
composer install --no-interaction --prefer-dist
vendor/bin/pint --test
php artisan test
```

En otra terminal:

```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm run build
```

El workflow de GitHub Actions ejecuta estas comprobaciones para pull requests y pushes a `develop` y `main`. No configures `users_app_test` como una base que contenga informacion que desees conservar.

## Permisos y diagnostico en Linux

El usuario del proceso web necesita leer el codigo y escribir solo en las rutas de runtime de Laravel. Desde la raiz del repositorio, adapta `www-data` al usuario real de PHP-FPM si es distinto:

```bash
sudo chown -R "$USER":www-data backend
sudo chmod -R u=rwX,g=rX,o= backend
sudo chmod -R ug=rwX,o= backend/storage backend/bootstrap/cache
```

No hagas `chmod 777` ni cambies permisos de `backend/.env` para hacerla publica. Limita su lectura al usuario que ejecuta Laravel y al grupo de despliegue autorizado. En una instalacion de desarrollo con `php artisan serve`, ejecuta los comandos como tu usuario normal; no hace falta asignar archivos al usuario web.

Comprobaciones utiles:

```bash
cd backend
php artisan about
php artisan migrate:status
php artisan route:list --path=api
tail -n 100 storage/logs/laravel.log
tail -f storage/logs/laravel.log
```

Verifica tambien que PostgreSQL esta listo (`pg_isready -h 127.0.0.1 -p 5432`) y que la API responde (`curl -i http://127.0.0.1:8000/up`). En produccion usa HTTPS, `APP_DEBUG=false`, claves propias, un usuario de base de datos de privilegios minimos y un gestor de secretos.

## Evidencias y limites documentados

La traza de CI, los casos cubiertos y los puntos pendientes estan en [rubric.md](rubric.md). La comparacion `EXPLAIN ANALYZE` y su limite al usar datos sinteticos se describen en [performance.md](performance.md). La importacion, los limites de archivo y la persistencia por lote estan en [imports.md](imports.md). Repite el benchmark con volumen y hardware de destino; sus milisegundos locales no son una garantia de produccion.

La suite automatizada cubre token vencido, invalido, reutilizado y recuperacion exitosa. Queda como mejora documentada medir dos solicitudes HTTP multiproceso que intenten consumir simultaneamente el mismo token; la cobertura actual de atomicidad se apoya en bloqueo transaccional y pruebas de integracion con base PostgreSQL.
