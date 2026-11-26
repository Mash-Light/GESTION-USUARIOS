<?php

namespace App\Domain\Imports\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class SpreadsheetReader
{
    public const MAX_ROWS = 100;

    public const HEADERS = [
        'first_name', 'middle_names', 'first_surname', 'second_surname',
        'identification', 'birth_date', 'username', 'password', 'status',
    ];

    /** @return list<array{row_number:int, data:array<string, mixed>}> */
    public function read(UploadedFile $file): array
    {
        $rows = strtolower($file->getClientOriginalExtension()) === 'xlsx'
            ? $this->readXlsx($file)
            : $this->readCsv($file);

        if (count($rows) === 0) {
            throw ValidationException::withMessages(['file' => 'El archivo no contiene filas para importar.']);
        }
        if (count($rows) > self::MAX_ROWS) {
            throw ValidationException::withMessages(['file' => 'El archivo supera el límite de 100 filas.']);
        }

        return $rows;
    }

    private function readCsv(UploadedFile $file): array
    {
        $stream = fopen($file->getRealPath(), 'rb');
        if ($stream === false) {
            throw ValidationException::withMessages(['file' => 'No se pudo leer el archivo.']);
        }

        try {
            $firstLine = fgets($stream);
            if ($firstLine === false) {
                throw ValidationException::withMessages(['file' => 'El archivo está vacío.']);
            }
            $delimiter = $this->detectDelimiter($firstLine);
            rewind($stream);
            $headers = fgetcsv($stream, null, $delimiter, '"', '\\');
            $headerMap = $this->headerMap($headers ?: []);
            $rows = [];
            $lineNumber = 1;

            while (($values = fgetcsv($stream, null, $delimiter, '"', '\\')) !== false) {
                $lineNumber++;
                if ($lineNumber > self::MAX_ROWS + 1) {
                    throw ValidationException::withMessages(['file' => 'El archivo supera el límite de 100 filas.']);
                }
                if ($this->isBlank($values)) {
                    continue;
                }
                $rows[] = ['row_number' => $lineNumber, 'data' => $this->mapValues($headerMap, $values)];
                if (count($rows) > self::MAX_ROWS) {
                    break;
                }
            }

            return $rows;
        } finally {
            fclose($stream);
        }
    }

    private function readXlsx(UploadedFile $file): array
    {
        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();
            $highestColumn = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());
            if ($highestColumn > count(self::HEADERS) || $sheet->getHighestDataRow() > self::MAX_ROWS + 1) {
                throw ValidationException::withMessages(['file' => 'El archivo supera el formato o límite de 100 filas esperado.']);
            }
            $headerValues = [];
            for ($column = 1; $column <= $highestColumn; $column++) {
                $coordinate = Coordinate::stringFromColumnIndex($column).'1';
                $headerValues[] = $sheet->getCell($coordinate)->getFormattedValue();
            }
            $headerMap = $this->headerMap($headerValues);
            $rows = [];
            $highestRow = $sheet->getHighestDataRow();

            for ($rowNumber = 2; $rowNumber <= $highestRow; $rowNumber++) {
                $values = [];
                for ($column = 1; $column <= $highestColumn; $column++) {
                    $cell = $sheet->getCell(Coordinate::stringFromColumnIndex($column).$rowNumber);
                    if ($cell->getDataType() === DataType::TYPE_FORMULA) {
                        throw ValidationException::withMessages(['file' => "No se admiten fórmulas en el archivo (fila {$rowNumber}). Usa valores directos."]);
                    }
                    $value = $cell->getFormattedValue();
                    if ($cell->getValue() !== null && ExcelDate::isDateTime($cell) && is_numeric($cell->getValue())) {
                        $value = ExcelDate::excelToDateTimeObject((float) $cell->getValue())->format('Y-m-d');
                    }
                    $values[] = $value;
                }
                if ($this->isBlank($values)) {
                    continue;
                }
                $rows[] = ['row_number' => $rowNumber, 'data' => $this->mapValues($headerMap, $values)];
                if (count($rows) > self::MAX_ROWS) {
                    break;
                }
            }

            $spreadsheet->disconnectWorksheets();

            return $rows;
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable) {
            throw ValidationException::withMessages(['file' => 'No se pudo leer el XLSX. Verifica que sea un libro de Excel válido.']);
        }
    }

    private function headerMap(array $headers): array
    {
        $normalized = array_map(function ($header): string {
            $header = trim((string) $header);
            $header = preg_replace('/^\xEF\xBB\xBF/', '', $header) ?? $header;

            return strtolower(str_replace(' ', '_', $header));
        }, $headers);

        $missing = array_values(array_diff(self::HEADERS, $normalized));
        if ($missing !== []) {
            throw ValidationException::withMessages(['file' => 'Faltan columnas requeridas: '.implode(', ', $missing).'.']);
        }
        $unexpected = array_values(array_diff($normalized, self::HEADERS));
        if ($unexpected !== []) {
            throw ValidationException::withMessages(['file' => 'Hay columnas no reconocidas: '.implode(', ', array_unique($unexpected)).'.']);
        }
        foreach (self::HEADERS as $header) {
            if (count(array_filter($normalized, fn (string $value): bool => $value === $header)) > 1) {
                throw ValidationException::withMessages(['file' => "La columna {$header} está repetida."]);
            }
        }

        return array_flip($normalized);
    }

    private function mapValues(array $headerMap, array $values): array
    {
        $data = [];
        foreach (self::HEADERS as $header) {
            $data[$header] = trim((string) ($values[$headerMap[$header]] ?? ''));
        }

        return $data;
    }

    private function detectDelimiter(string $header): string
    {
        $counts = array_map(fn (string $delimiter): int => substr_count($header, $delimiter), [',', ';', "\t"]);
        $delimiters = [',', ';', "\t"];

        return $delimiters[array_search(max($counts), $counts, true)];
    }

    private function isBlank(array $values): bool
    {
        return collect($values)->every(fn ($value): bool => $value === null || trim((string) $value) === '');
    }
}
