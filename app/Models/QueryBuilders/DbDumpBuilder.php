<?php

namespace App\Models\QueryBuilders;

use App\Models\DbDump as BuilderModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method Collection|BuilderModel[] get(string[] $columns = ['*'])
 * @method BuilderModel|null find(string $id)
 * @method BuilderModel findOrFail(string $id)
 * @method self with(array $relations)
 * @method BuilderModel newModelInstance(array $attributes = [])
 */
abstract class DbDumpBuilder extends Builder
{
}
