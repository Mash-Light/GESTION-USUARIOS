# Importación de personas y cuentas

## Archivo admitido

`POST /api/imports` recibe `multipart/form-data` con un campo `file`. La ruta exige la sesión activa y el permiso `imports.manage`, que por ahora se concede al rol Administrador.

Se admiten CSV y XLSX, hasta 10 MB y 100 filas de datos por petición. El CSV detecta delimitadores coma, punto y coma o tabulación. La primera fila lleva estos encabezados exactos (en cualquier orden):

```text
first_name,middle_names,first_surname,second_surname,identification,birth_date,username,password,status
```

`middle_names`, `birth_date` y `status` pueden quedar vacíos; `status` vacío equivale a `active`. La fecha se expresa como `AAAA-MM-DD` en CSV. En XLSX también se aceptan celdas de fecha de Excel. Las fórmulas no se admiten. El rol se asigna como `member` y no se acepta desde el archivo para evitar que una carga masiva eleve privilegios.

## Validación y transacciones

Cada fila aplica las reglas de creación existentes: nombres, identificación nacional, usuario y contraseña. La validación detecta duplicados dentro del archivo y contra la base de datos. Cada cuenta válida se crea en una transacción propia usando el servicio de gestión y la generación de correo ya existentes. Un error de una fila no revierte las demás.

La huella SHA-256 del archivo junto con el usuario que lo subió hace idempotente el lote. Volver a subir el mismo contenido devuelve HTTP 409 y el resultado previo; no crea cuentas duplicadas. Los datos del lote y los errores se conservan en `import_batches` e `import_rows`; el archivo temporal y las contraseñas en texto claro no se guardan en tablas ni auditoría. Las contraseñas de cuentas creadas se almacenan con el hasher configurado para Laravel.

Como el archivo transporta contraseñas iniciales, trátalo como material sensible: usa una conexión segura y elimina la copia local después de revisar el resultado. El backend no devuelve contraseñas ni valores completos de las filas fallidas.

## Resultado

La respuesta incluye el identificador del lote, estado (`completed`, `partial` o `failed`), conteos y filas fallidas con su número de fila y mensajes por campo. Los lotes también se registran en auditoría. La carga es síncrona y está limitada a 100 filas para mantener acotado el trabajo de hashing y base de datos dentro de una petición web. Para cargas mayores se pueden dividir los archivos en lotes; no se deja una petición web esperando por cientos de hashes.
