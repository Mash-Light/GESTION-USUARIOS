<?php

namespace App\Domain\Auth\DTOs;

use App\Models\User;

final readonly class LoginResult
{
    private function __construct(public string $status, public ?User $user = null) {}

    public static function success(User $user): self
    {
        return new self('success', $user);
    }

    public static function invalid(): self
    {
        return new self('invalid');
    }

    public static function locked(): self
    {
        return new self('locked');
    }

    public static function inactive(): self
    {
        return new self('inactive');
    }

    public static function sessionActive(): self
    {
        return new self('session_active');
    }

    public static function rateLimited(): self
    {
        return new self('rate_limited');
    }
}
