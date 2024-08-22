<?php

namespace App\Models\QueryBuilders;

use App\Models\MeetingResource as BuilderModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * @method Collection|BuilderModel[] get(string[] $columns = ['*'])
 * @method BuilderModel|null find(string $id)
 * @method BuilderModel findOrFail(string $id)
 * @method self with(array $relations)
 * @method BuilderModel newModelInstance(array $attributes = [])
 */
abstract class MeetingResourceBuilder extends Builder
{
}
