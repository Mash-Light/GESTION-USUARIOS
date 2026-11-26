<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (app()->environment('production')) {
    fwrite(STDERR, "Este informe EXPLAIN ANALYZE debe ejecutarse en una base de desarrollo o prueba.\n");
    exit(1);
}

$sql = file_get_contents(__DIR__.'/people-search-explain.sql');
$statements = preg_split('/;\s*(?:\r?\n|$)/', $sql) ?: [];

foreach ($statements as $statement) {
    $statement = trim(preg_replace('/^\s*--.*$/m', '', $statement) ?? '');

    if ($statement === '') {
        continue;
    }

    $bindings = str_contains($statement, ':term')
        ? ['term' => '%'.(string) env('EXPLAIN_SEARCH_TERM', 'and').'%']
        : [];
    $rows = DB::select($statement, $bindings);

    foreach ($rows as $row) {
        echo $row->{'QUERY PLAN'} ?? json_encode($row, JSON_THROW_ON_ERROR), PHP_EOL;
    }
}
