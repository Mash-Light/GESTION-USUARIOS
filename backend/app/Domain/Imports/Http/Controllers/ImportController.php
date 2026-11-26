<?php

namespace App\Domain\Imports\Http\Controllers;

use App\Domain\Imports\Http\Requests\StoreImportRequest;
use App\Domain\Imports\Services\ImportPeopleService;
use Illuminate\Http\JsonResponse;

class ImportController
{
    public function store(StoreImportRequest $request, ImportPeopleService $imports): JsonResponse
    {
        $result = $imports->import($request, $request->file('file'));

        if ($result['duplicate']) {
            return response()->json([
                'message' => 'Este archivo ya fue procesado por tu cuenta.',
                'data' => $result['batch'],
            ], 409);
        }

        return response()->json(['data' => $result['batch']], 201);
    }
}
