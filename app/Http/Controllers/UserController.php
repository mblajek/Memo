<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiValidationException;
use App\Exceptions\ExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use OpenApi\Annotations\OpenApi as OA;
use Illuminate\Http\Request;
use stdClass;

/** System endpoints without authorisation */
class UserController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::any);
        $this->permissionOneOf(Permission::unverified, Permission::verified)->only('status');
        $this->permissionOneOf(Permission::globalAdmin)->only('adminTest');
    }

    /**
     * @OA\Post(
     *     path="/api/v1/user/login",
     *     tags={"User"},
     *     summary="User login",
     *     @OA\RequestBody(@OA\JsonContent(
     *         @OA\Property(property="email", type="string", example="test@test.pl"),
     *         @OA\Property(property="password", type="string", example="123456"),
     *         required={"email", "password"}
     *     )),
     *     @OA\Response(response="200", description="OK"),
     *     @OA\Response(response="400", description="Bad Request"),
     *     @OA\Response(response="401", description="Unauthorised")
     * )
     * @throws ApiValidationException
     */
    public function login(Request $request): JsonResponse
    {
        $loginData = $request->validate([
            'email' => 'bail|required|string|email',
            'password' => 'required|string'
        ]);
        if (Auth::attempt($loginData)) {
            $request->session()->regenerate();
            return new JsonResponse(new stdClass());
        }
        throw ExceptionFactory::unauthorised();
    }

    /**
     * @OA\Get(
     *     @OA\Response(
     *        response="200",
     *        description="Facilities JSON",
     *        @OA\JsonContent(
     *            @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/FacilityResource")),
     *        ),
     *     ),
     * ),
     */

    /**
     * @OA\Get(
     *     path="/api/v1/user/status",
     *     tags={"User"},
     *     summary="User status",
     *     @OA\Response(response="200", description="Translations JSON", @OA\JsonContent(
     *         @OA\Property(property="data", type="object", ref="#/components/schemas/UserResource")
     *     )),
     *     @OA\Response(response="401", description="Unauthorised")
     * )
     */
    public function status(): JsonResponse
    {
        return new JsonResponse(['data' => ['user' => UserResource::make(Auth::user())]]);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/user/logout",
     *     tags={"User"},
     *     summary="User logout",
     *     @OA\Response(response="200", description="OK"),
     * )
     */
    public function logout(): JsonResponse
    {
        Auth::logout();
        return new JsonResponse(new stdClass());
    }
}
