<?php

namespace App\Tquery\Filter;

use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqConfig;
use App\Tquery\Engine\TqBuilder;

readonly class TqRequestFilterGroup extends TqRequestAbstractFilter
{
    public static function fromArray(TqConfig $config, array $data, array $path): self
    {
        throw new \Exception('TODO');
    }

    public function applyFilter(TqBuilder $builder, bool $or): void
    {
        throw new \Exception('TODO');
    }

    /** @return TqColumnConfig[] */
    public function getColumns(): array
    {
        throw new \Exception('TODO');
    }
}
