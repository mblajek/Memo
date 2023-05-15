<?php

namespace App\Http\Controllers;

use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionMiddleware;
use Illuminate\Routing\Controller;
use Illuminate\Routing\ControllerMiddlewareOptions;
use OpenApi\Attributes as OA;

#[OA\Info(version: '0.1.0', title: 'Memo API')]
abstract class ApiController extends Controller
{
    public function __construct()
    {
        $this->permissionOneOf(Permission::any);
        $this->initPermissions();
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
