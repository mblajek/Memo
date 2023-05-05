<?php

namespace App\Eloquent\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Ramsey\Uuid\UuidInterface;

/**
 * @property Model model
 */
trait BaseRepository
{
    public function newInstance(array $attributes): Model
    {
        return $this->model->newInstance($attributes);
    }

    public function find(UuidInterface $id): ?Model
    {
        return $this->builder()->find($id->toString());
    }

    public function findWith(UuidInterface $id, array $relations): ?Model
    {
        return $this->builder()->with($relations)->find($id->toString());
    }

    public function findOrFailWith(UuidInterface $id, array $relations): Model
    {
        return $this->builder()->with($relations)->findOrFail($id->toString());
    }

    public function findOrFail(UuidInterface $id): Model
    {
        return $this->builder()->findOrFail($id->toString());
    }

    public function getList(): Collection
    {
        return $this->builder()->get();
    }

    protected function builder(): Builder
    {
        return $this->model->newQuery();
    }
}
