<?php

namespace App\Domain\Imports\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['created_by', 'file_sha256', 'status', 'total_rows', 'success_rows', 'error_rows', 'completed_at'])]
class ImportBatch extends Model
{
    protected function casts(): array
    {
        return ['completed_at' => 'datetime'];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function rows(): HasMany
    {
        return $this->hasMany(ImportRow::class);
    }
}
