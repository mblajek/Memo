<?php

namespace App\Tquery\Engine;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Request\TqRequest;
use Closure;
use Illuminate\Support\Facades\App;
use stdClass;
use Throwable;

readonly class TqEngine
{
    // readonly, but mutable
    private TqBuilder $builder;

    public function __construct(
        Closure $getBuilder,
        private TqRequest $request,
    ) {
        $this->builder = $getBuilder();
    }

    public function run(): array
    {
        $this->applyMutators();
        $this->applyJoin();
        $this->applySelect();
        $this->applyFilter();
        $this->applySort();
        $this->applyPaging();
        $debug = (App::hasDebugModeEnabled() ? ['sql' => $this->builder->getSql(true)] : []);
        try {
            return array_merge($debug, ['meta' => $this->getMeta(), 'data' => $this->getData()]);
        } catch (Throwable $error) {
            throw FatalExceptionFactory::tquery($debug ? (['message' => $error->getMessage()] + $debug) : []);
        }
    }

    private function applyMutators(): void
    {
        if ($this->request->isDistinct) {
            $this->builder->distinct();
        }
    }

    private function applyJoin(): void
    {
        foreach ($this->request->allColumns as $columnConfig) {
            $columnConfig->applyJoin($this->builder);
        }
    }

    private function applySelect(): void
    {
        foreach ($this->request->selectColumns as $requestColumn) {
            $requestColumn->applySelect($this->builder);
        }
    }

    private function applyFilter(): void
    {
        match ($this->request->filter) {
            true => null,
            false => $this->builder->where(fn(null $bind) => 'false', false, null, false, false),
            default => $this->request->filter->applyFilter($this->builder, false, false)
        };
    }

    private function applySort(): void
    {
        foreach ($this->request->sortColumns as $requestSort) {
            $requestSort->applySort($this->builder);
        }
        $this->builder->orderBy("`{$this->request->config->uniqueTable->name}`.`id`", desc: false);
    }

    private function applyPaging(): void
    {
        $this->builder->applyPaging(offset: $this->request->pageOffset, limit: $this->request->pageSize);
    }

    private function getData(): array
    {
        return array_map(function (stdClass $row) {
            $array = [];
            foreach ($this->request->selectColumns as $requestColumn) {
                $columnAlias = $requestColumn->column->columnAlias;
                $array[$columnAlias] = $requestColumn->column->render($row->{$columnAlias});
            }
            return $array;
        }, $this->builder->getData());
    }


    private function getMeta(): array
    {
        $dataCount = $this->builder->getCount();
        return [
            'totalDataSize' => $dataCount,
            'totalDataPages' => intdiv($dataCount - 1, $this->request->pageSize) + 1,
        ];
    }
}
