# Rendimiento de la búsqueda de personas

## Índices

La lista administrativa permite buscar por nombre completo, identificación, usuario y correo usando coincidencia parcial (`LIKE '%texto%'`). Un B-tree no acelera ese patrón con comodín inicial. La migración `2026_11_26_020002_add_people_search_trigram_indexes` habilita `pg_trgm` y agrega índices GIN trigram para esos cuatro campos; el índice de nombre usa la misma expresión inmutable de la consulta y los índices parciales omiten filas dadas de baja.

Los índices GIN ocupan espacio y tienen costo de escritura. Se justifican para la búsqueda parcial requerida; conviene volver a medir su tamaño y frecuencia de uso con datos representativos en producción.

## Reproducir `EXPLAIN ANALYZE`

Desde `backend`, configura `.env` para una base de desarrollo con datos representativos y ejecuta:

```bash
php database/performance/run-people-search-explain.php
```

El script rechaza `APP_ENV=production`, actualiza estadísticas con `ANALYZE` y ejecuta la consulta en solo lectura con `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)`. Cambia el término de búsqueda en `database/performance/people-search-explain.sql` por uno de al menos tres caracteres que aparezca en los datos que quieras medir. No uses una base con datos que no deban consultarse.

Para comparar ambos planes sin guardar datos sintéticos, usa exclusivamente una base de prueba terminada en `_test` o `_benchmark`:

```bash
DB_DATABASE=users_app_test php database/performance/benchmark-people-search.php
```

En PowerShell:

```powershell
$env:DB_DATABASE = 'users_app_test'
php database/performance/benchmark-people-search.php
```

El benchmark compara la consulta anterior con `OR` sobre la tabla unida y la consulta reescrita, usando 200.000 personas sintéticas y una coincidencia. Inserta todo dentro de una transacción, la revierte al terminar y vuelve a analizar las tablas vacías para dejar correctas las estadísticas.

## Lectura de la medición local

Medición del entorno local de desarrollo, con el conjunto pequeño de demostración y el término `and`:

- Resultado: 1 fila coincidente.
- Plan: `Seq Scan` en `people` y `users`, hash join, ordenamiento en memoria.
- Buffers: 2 bloques compartidos leídos desde caché durante la ejecución.
- Tiempo de ejecución observado: aproximadamente 0.1 ms.

El planificador prefiere escaneos secuenciales en tablas pequeñas porque leer todos sus bloques cuesta menos que iniciar búsquedas en varios índices GIN. Esto es esperado y no demuestra que los índices no funcionen. Para verificar el uso de GIN, carga un volumen representativo en una base de prueba, ejecuta `ANALYZE` y compara el plan y buffers. Los tiempos de esta medición son orientativos y dependen del equipo.

### Última comparación sintética local

Medición repetida en el entorno local contra `users_app_test`, con 200.000 personas/cuentas sintéticas y una coincidencia para `target`:

- Consulta original con `OR` sobre tablas unidas: **275,825 ms**. El plan hizo `Parallel Seq Scan` de `people` y `users`, `Parallel Hash Join` y eliminó 100.000 filas en el filtro del join. Usó 5.919 buffers compartidos y además leyó/escribió buffers temporales (`2.755`/`2.776`).
- Consulta reescrita por campo con trigram: **50,615 ms**. El plan hizo búsquedas bitmap con los cuatro índices GIN: nombre completo, identificación, username y email. Usó 886 buffers compartidos en caché y leyó 119.
- Diferencia observada: **81,6 % menos tiempo**, aproximadamente **5,45 veces más rápida** en esta ejecución.

El benchmark insertó los registros dentro de una transacción y la revirtió; se verificó después que `people` y `users` siguieran con cero filas en la base de prueba. La comparación es una ejecución local sobre datos sintéticos: los tiempos dependen de caché, estadísticas, configuración de PostgreSQL y hardware. No es una garantía de producción; repítela con cardinalidad y hardware representativos del despliegue.
