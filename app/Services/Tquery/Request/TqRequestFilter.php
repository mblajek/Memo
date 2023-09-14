<?php

namespace App\Services\Tquery\Request;

readonly class TqRequestFilter
{
    public static function fromArray(?array $array): self
    {
        return new self();
    }

    private function __construct()
    {
    }
}
