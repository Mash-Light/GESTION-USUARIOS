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

## Lectura de la medición local

Medición del entorno local de desarrollo, con el conjunto pequeño de demostración y el término `and`:

- Resultado: 1 fila coincidente.
- Plan: `Seq Scan` en `people` y `users`, hash join, ordenamiento en memoria.
- Buffers: 2 bloques compartidos leídos desde caché durante la ejecución.
- Tiempo de ejecución observado: aproximadamente 0.1 ms.

El planificador prefiere escaneos secuenciales en tablas pequeñas porque leer todos sus bloques cuesta menos que iniciar búsquedas en varios índices GIN. Esto es esperado y no demuestra que los índices no funcionen. Para verificar el uso de GIN, carga un volumen representativo en una base de prueba, ejecuta `ANALYZE` y compara el plan y buffers. Los tiempos de esta medición son orientativos y dependen del equipo.
