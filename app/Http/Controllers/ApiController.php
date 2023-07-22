<?php

namespace App\Http\Controllers;

use App\Exceptions\FatalExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObject;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Routing\ControllerMiddlewareOptions;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Info(version: '0.2.0', title: 'Memo API')]
abstract class ApiController extends Controller
{
    private readonly PermissionObject $permissionObject;
    private readonly array $requestIn;

    public function __construct(private readonly Request $request)
    {
        $this->permissionOneOf(Permission::any);
        $this->initPermissions();
    }

    public function getFacilityOrFail(): Facility
    {
        $permissionObject = $this->getPermissionObject();
        if ($permissionObject->facility) {
            return $permissionObject->facility;
        }
        throw FatalExceptionFactory::unexpected();
    }

    public function getUserOrFail(): User
    {
        $permissionObject = $this->getPermissionObject();
        if ($permissionObject->user) {
            return $permissionObject->user;
        }
        throw FatalExceptionFactory::unexpected();
    }

    protected function getPermissionObject(): PermissionObject
    {
        if (empty($this->permissionObject)) {
            $this->permissionObject = $this->request->attributes->get(PermissionMiddleware::PERMISSIONS_KEY);
        }
        return $this->permissionObject;
    }

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

    protected function applyRequestIn(Builder $query, string $column = 'id'): void
    {
        $in = $this->getRequestIn();
        if ($in) {
            $query->whereIn($column, $this->getRequestIn());
        }
    }

    abstract protected function initPermissions(): void;
}
