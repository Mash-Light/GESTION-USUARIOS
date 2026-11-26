<?php

namespace App\Domain\Imports\Services;

use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Imports\Models\ImportBatch;
use App\Domain\People\Services\PersonManagementService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ImportPeopleService
{
    public function __construct(
        private readonly SpreadsheetReader $reader,
        private readonly PersonManagementService $people,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function import(Request $request, UploadedFile $file): array
    {
        $rows = $this->reader->read($file);
        $fileHash = hash_file('sha256', $file->getRealPath());
        $actor = $request->user();

        $batch = DB::transaction(function () use ($fileHash, $actor): ImportBatch {
            if (DB::getDriverName() === 'pgsql') {
                DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ["import:{$actor->id}:{$fileHash}"]);
            }

            $existing = ImportBatch::query()
                ->where('created_by', $actor->id)
                ->where('file_sha256', $fileHash)
                ->first();
            if ($existing) {
                return $existing;
            }

            return ImportBatch::query()->create([
                'created_by' => $actor->id,
                'file_sha256' => $fileHash,
                'status' => 'processing',
            ]);
        }, attempts: 3);

        if (! $batch->wasRecentlyCreated) {
            return ['duplicate' => true, 'batch' => $this->summary($batch)];
        }

        $seen = ['identification' => [], 'username' => []];
        $successCount = 0;
        $failureCount = 0;

        try {
            foreach ($rows as $row) {
                $data = $this->defaults($row['data']);
                $errors = $this->validateRow($data, $seen);
                $result = DB::transaction(function () use ($request, $batch, $row, $data, $errors): array {
                    if ($errors !== []) {
                        $batch->rows()->create([
                            'row_number' => $row['row_number'],
                            'status' => 'failed',
                            'identification' => $data['identification'] ?: null,
                            'errors' => $errors,
                        ]);

                        return ['success' => false];
                    }

                    try {
                        $user = $this->people->create($request, $data);
                    } catch (ValidationException $exception) {
                        $batch->rows()->create([
                            'row_number' => $row['row_number'],
                            'status' => 'failed',
                            'identification' => $data['identification'] ?: null,
                            'errors' => $exception->errors(),
                        ]);

                        return ['success' => false];
                    } catch (QueryException $exception) {
                        if ($exception->getCode() !== '23505') {
                            throw $exception;
                        }
                        $batch->rows()->create([
                            'row_number' => $row['row_number'],
                            'status' => 'failed',
                            'identification' => $data['identification'] ?: null,
                            'errors' => ['row' => ['Un dato único de esta fila ya está registrado.']],
                        ]);

                        return ['success' => false];
                    }

                    $batch->rows()->create([
                        'row_number' => $row['row_number'],
                        'status' => 'imported',
                        'identification' => $data['identification'],
                        'person_id' => $user->person_id,
                        'user_id' => $user->id,
                    ]);

                    return ['success' => true];
                }, attempts: 3);

                $result['success'] ? $successCount++ : $failureCount++;
            }

            $batch->forceFill([
                'status' => $failureCount === 0 ? 'completed' : ($successCount === 0 ? 'failed' : 'partial'),
                'total_rows' => count($rows),
                'success_rows' => $successCount,
                'error_rows' => $failureCount,
                'completed_at' => now(),
            ])->save();

            $this->auditLogger->record($request, 'imports.completed', 'success', $actor, null, [
                'batch_id' => $batch->id,
                'total_rows' => count($rows),
                'success_rows' => $successCount,
                'error_rows' => $failureCount,
            ]);
        } catch (\Throwable $exception) {
            $batch->forceFill([
                'status' => 'failed',
                'total_rows' => count($rows),
                'success_rows' => $successCount,
                'error_rows' => max(1, count($rows) - $successCount),
                'completed_at' => now(),
            ])->save();

            throw $exception;
        }

        return ['duplicate' => false, 'batch' => $this->summary($batch->fresh())];
    }

    private function defaults(array $data): array
    {
        $data['middle_names'] = $data['middle_names'] ?: null;
        $data['birth_date'] = $data['birth_date'] ?: null;
        $data['status'] = $data['status'] ?: 'active';
        $data['role'] = 'member';

        return $data;
    }

    private function validateRow(array $data, array &$seen): array
    {
        $validator = Validator::make($data, [
            'first_name' => ['required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'middle_names' => ['nullable', 'string', 'max:120', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'first_surname' => ['required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'second_surname' => ['required', 'string', 'max:60', 'regex:/^[\pL\pM][\pL\pM\'’ -]*$/u'],
            'identification' => ['required', 'string', 'regex:/^(?!.*([0-9])\\1{3})[0-9]{10}$/'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'username' => ['required', 'string', 'min:8', 'max:20', 'regex:/^(?=.*[A-Z])(?=.*[0-9])[A-Za-z0-9]+$/'],
            'password' => ['required', 'string', 'not_regex:/\s/', Password::min(10)->mixedCase()->numbers()->symbols()],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $errors = $validator->errors()->messages();
        foreach (['identification' => 'identification', 'username' => 'username'] as $field => $key) {
            $value = $field === 'username' ? strtolower($data[$field]) : $data[$field];
            if ($value === '' || isset($errors[$field])) {
                continue;
            }
            if (isset($seen[$key][$value])) {
                $errors[$field][] = 'El valor se repite en otra fila del archivo.';
            } else {
                $seen[$key][$value] = true;
            }
        }

        return $errors;
    }

    private function summary(ImportBatch $batch): array
    {
        return [
            'id' => $batch->id,
            'status' => $batch->status,
            'total_rows' => $batch->total_rows,
            'success_rows' => $batch->success_rows,
            'error_rows' => $batch->error_rows,
            'completed_at' => $batch->completed_at?->toIso8601String(),
            'rows' => $batch->rows()->orderBy('row_number')->get(['row_number', 'status', 'errors']),
        ];
    }
}
