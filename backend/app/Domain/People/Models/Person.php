<?php

namespace App\Domain\People\Models;

use App\Models\User;
use Database\Factories\PersonFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['first_name', 'middle_names', 'first_surname', 'second_surname', 'identification', 'birth_date'])]
#[UseFactory(PersonFactory::class)]
class Person extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return ['birth_date' => 'date'];
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function fullName(): string
    {
        return collect([
            $this->first_name,
            $this->middle_names,
            $this->first_surname,
            $this->second_surname,
        ])->filter()->implode(' ');
    }
}
