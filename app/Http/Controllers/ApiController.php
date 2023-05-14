<?php

namespace App\Http\Controllers;

use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionMiddleware;
use Illuminate\Routing\Controller;
use Illuminate\Routing\ControllerMiddlewareOptions;
use OpenApi\Annotations as OA;

/** @OA\Info(title="Memo API", version="0.1.0") */
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
