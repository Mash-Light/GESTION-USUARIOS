<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$database = DB::connection()->getDatabaseName();
if (app()->environment('production') || (! str_ends_with($database, '_test') && ! str_ends_with($database, '_benchmark'))) {
    fwrite(STDERR, "La medición sintética requiere una base *_test o *_benchmark que no sea producción.\n");
    exit(1);
}
if (DB::getDriverName() !== 'pgsql') {
    fwrite(STDERR, "La medición requiere PostgreSQL.\n");
    exit(1);
}

$connection = DB::connection();
$connection->beginTransaction();

try {
    $connection->unprepared(<<<'SQL'
        CREATE TEMPORARY TABLE benchmark_people (
            sequence integer PRIMARY KEY,
            identification char(10) NOT NULL,
            person_id bigint NULL
        ) ON COMMIT DROP
        SQL);

    $connection->unprepared(<<<'SQL'
        WITH RECURSIVE digits AS (
            SELECT
                sample_id AS sequence,
                1 AS position,
                floor(sample_id::numeric / power(8::numeric, 9))::integer + 1 AS digit,
                ''::text AS identification
            FROM generate_series(0, 199999) AS samples(sample_id)
            UNION ALL
            SELECT
                sequence,
                position + 1,
                mod(digit - 1 + mod(floor(sequence::numeric / power(8::numeric, 9 - position))::integer, 8) + 1, 9) + 1,
                identification || digit::text
            FROM digits
            WHERE position < 10
        )
        INSERT INTO benchmark_people (sequence, identification)
        SELECT sequence, identification || digit::text
        FROM digits
        WHERE position = 10
        SQL);

    $connection->unprepared(<<<'SQL'
        WITH inserted AS (
            INSERT INTO people (first_name, middle_names, first_surname, second_surname, identification, created_at, updated_at)
            SELECT
                CASE WHEN sequence = 0 THEN 'Target' ELSE 'Persona' END,
                NULL,
                'Bench' || lpad(sequence::text, 6, '0'),
                'Demo',
                identification,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM benchmark_people
            RETURNING id, identification
        )
        UPDATE benchmark_people AS source
        SET person_id = inserted.id
        FROM inserted
        WHERE source.identification = inserted.identification
        SQL);

    $connection->unprepared(<<<'SQL'
        INSERT INTO users (person_id, username, email, password, status, created_at, updated_at)
        SELECT
            person_id,
            'Bench' || lpad(sequence::text, 6, '0'),
            'bench' || sequence::text || '@example.test',
            'not-a-real-password-hash',
            'active',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM benchmark_people
        SQL);

    $connection->statement('ANALYZE people');
    $connection->statement('ANALYZE users');
    foreach (['baseline' => 'people-search-baseline.sql', 'trigram indexes' => 'people-search-explain.sql'] as $label => $filename) {
        echo "\n--- {$label} ---\n";
        $source = file_get_contents(__DIR__.'/'.$filename);
        $explain = collect(preg_split('/;\s*(?:\r?\n|$)/', $source) ?: [])
            ->map(fn (string $part): string => trim(preg_replace('/^\s*--.*$/m', '', $part) ?? ''))
            ->first(fn (string $part): bool => str_starts_with(strtoupper($part), 'EXPLAIN'));

        foreach ($connection->select($explain, ['term' => '%target%']) as $row) {
            echo $row->{'QUERY PLAN'}, PHP_EOL;
        }
    }

    echo "\nSynthetic records: 200,000; matching names: 1; search term: target.\n";
} finally {
    $connection->rollBack();
    $connection->statement('ANALYZE people');
    $connection->statement('ANALYZE users');
    echo "Transaction rolled back; synthetic records were discarded.\n";
}
