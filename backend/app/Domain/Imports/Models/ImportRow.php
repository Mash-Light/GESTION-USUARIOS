<?php

namespace App\Domain\Imports\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['import_batch_id', 'row_number', 'status', 'identification', 'errors', 'person_id', 'user_id'])]
class ImportRow extends Model
{
    protected function casts(): array
    {
        return ['errors' => 'array'];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class, 'import_batch_id');
    }
}
