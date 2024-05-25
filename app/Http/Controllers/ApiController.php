<?php

namespace App\Http\Controllers;

use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionMiddleware;
use App\Models\Facility;
use App\Models\User;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Routing\ControllerMiddlewareOptions;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Info(version: ApiController::VERSION, title: 'Memo API')]
abstract class ApiController extends Controller
{
    protected const string VERSION = '0.9.1';
    private readonly array $requestIn;

    public function __construct(private readonly Request $request)
    {
        $this->permissionOneOf(Permission::any);
        $this->initPermissions();
    }

    protected function validate(array $rules): array
    {
        Valid::reset();
        return $this->request->validate($rules + ['dry_run' => Valid::bool(['declined'], sometimes: true)]);
    }

    public function getFacilityOrFail(): Facility
    {
        return PermissionMiddleware::facility();
    }

    public function getUserOrFail(): User
    {
        return PermissionMiddleware::user();
    }

    /** Require permission in initPermissions() */
    protected function permissionOneOf(Permission ...$permissions): ControllerMiddlewareOptions
    {
        return $this->middleware(
            PermissionMiddleware::class . ':' .
            implode(',', array_map(fn(Permission $permission) => $permission->name, $permissions))
        );
    }

    protected function getRequestIn(): array
    {
        if (!isset($this->requestIn)) {
            // no use of Valid rule generator to keep this fast as possible
            $in = $this->request->validate(['in' => 'nullable|string|lowercase'])['in'] ?? null;
            if ($in) {
                $inArr = explode(',', $in);
                Validator::validate(['in' => $inArr], ['in.*' => 'bail|required|string|uuid']);
                $this->requestIn = array_values(array_unique($inArr));
            } else {
                $this->requestIn = [];
            }
        }
        return $this->requestIn;
    }

    protected function applyRequestIn(EloquentBuilder|Builder $query, string $column = 'id'): void
    {
        $in = $this->getRequestIn();
        if ($in) {
            $query->whereIn($column, $this->getRequestIn());
        }
    }

    abstract protected function initPermissions(): void;
}
