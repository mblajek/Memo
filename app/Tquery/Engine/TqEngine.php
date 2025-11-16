<?php

namespace App\Tquery\Engine;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Request\TqRequest;
use Closure;
use stdClass;
use Throwable;

readonly class TqEngine
{
    public function __construct(
        private Closure $getBuilder,
        private TqRequest $request,
        private bool $hasDebugMode,
        private string $sortCollation,
    ) {
    }

    public function run(): array
    {
        $builder = ($this->getBuilder)();
        $this->applyMutators($builder);
        $this->applyJoin($builder);
        $this->applySelect($builder);
        $this->applyFilter($builder);
        $this->applySort($builder);
        $this->applyPaging($builder);
        $builder->finish();
        $debug = ($this->hasDebugMode ? ['sql' => $builder->getSql(true)] : []);
        try {
            return array_merge($debug, ['meta' => $this->getMeta($builder), 'data' => $this->getData($builder)]);
        } catch (Throwable $error) {
            throw FatalExceptionFactory::tquery($debug ? (['message' => $error->getMessage()] + $debug) : []);
        }
    }

    private function applyMutators(TqBuilder $builder): void
    {
        if ($this->request->isDistinct) {
            $builder->distinct();
        }
    }

    private function applyJoin(TqBuilder $builder): void
    {
        foreach ($this->request->allColumns as $columnConfig) {
            $columnConfig->applyJoin($builder);
        }
    }

    private function applySelect(TqBuilder $builder): void
    {
        foreach ($this->request->selectColumns as $requestColumn) {
            $requestColumn->applySelect($builder);
        }
    }

    private function applyFilter(TqBuilder $builder): void
    {
        match ($this->request->filter) {
            true => null,
            false => $builder->where(fn(null $bind) => 'false', false, null, false, false),
            default => $this->request->filter->applyFilter($builder, false, false)
        };
    }

    private function applySort(TqBuilder $builder): void
    {
        foreach ($this->request->sortColumns as $requestSort) {
            $requestSort->applySort($builder, $this->sortCollation);
        }
        $builder->orderBy("`{$this->request->config->uniqueTable->name}`.`id`", desc: false);
    }

    private function applyPaging(TqBuilder $builder): void
    {
        $builder->applyPaging(offset: $this->request->pageOffset, limit: $this->request->pageSize);
    }

    private function getData(TqBuilder $builder): array
    {
        return array_map(function (stdClass $row) {
            $array = [];
            foreach ($this->request->selectColumns as $requestColumn) {
                $columnAlias = $requestColumn->column->columnAlias;
                $array[$columnAlias] = $requestColumn->column->render($row->{$columnAlias});
            }
            return $array;
        }, $builder->getData());
    }

    private function getMeta(TqBuilder $builder): array
    {
        $dataCount = $builder->getCount();
        return [
            'totalDataSize' => $dataCount,
            'totalDataPages' => intdiv($dataCount - 1, $this->request->pageSize) + 1,
        ];
    }
}
