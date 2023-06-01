<?php

namespace App\Http\Controllers;

use App\Exceptions\FatalExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObject;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Routing\ControllerMiddlewareOptions;
use OpenApi\Attributes as OA;

#[OA\Info(version: '0.2.0', title: 'Memo API')]
abstract class ApiController extends Controller
{
    private readonly PermissionObject $permissionObject;

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

    abstract protected function initPermissions(): void;
}
