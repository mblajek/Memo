<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use stdClass;
use OpenApi\Attributes as OA;

/** System endpoints without authorisation */
class UserController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::any);
        $this->permissionOneOf(Permission::unverified, Permission::verified)->only('status');
    }

    #[OA\Post(
        path: '/api/v1/user/login',
        summary: 'User login',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['email', 'password'], properties: [
                new OA\Property(property: 'email', type: 'string', example: 'test@test.pl'),
                new OA\Property(property: 'password', type: 'string', example: '123456'),
            ]
            )
        ),
        tags: ['User'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException */
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

    #[OA\Get(
        path: '/api/v1/user/status',
        summary: 'User status',
        tags: ['User'],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'user', ref: '#/components/schemas/UserResource', type: 'object'),
                    new OA\Property(
                        property: 'permissions', ref: '#/components/schemas/PermissionsResource', type: 'object'
                    ),
                ]
            )
            ),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function status(Request $request): JsonResponse
    {
        return new JsonResponse([
            'data' => [
                'user' => UserResource::make($request->user()),
                'permissions' => PermissionResource::make(
                    $request->attributes->get(PermissionMiddleware::PERMISSIONS_KEY)
                ),
            ]
        ]);
    }

    #[OA\Post(
        path: '/api/v1/user/logout',
        summary: 'User logout',
        tags: ['User'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
        ]
    )]
    public function logout(): JsonResponse
    {
        Auth::logout();
        return new JsonResponse(new stdClass());
    }
}
