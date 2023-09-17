<?php

namespace App\Services\Tquery\Filter;

use App\Services\Tquery\Config\TqConfig;

readonly class TqRequestFilterGroup extends TqRequestAbstractFilter
{
    public static function fromArray(TqConfig $config, array $data, array $path): self
    {
        throw new \Exception('TODO');
    }

    public function getColumns(): array
    {
        throw new \Exception('TODO');
    }
}
