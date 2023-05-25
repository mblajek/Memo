<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Services\Facility\CreateFacilityService;
use App\Services\Facility\UpdateFacilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;
use OpenApi\Attributes\Schema;
use Throwable;

class AdminFacilityController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);
    }

    #[OA\Post(
        path: '/api/v1/admin/facility',
        summary: 'Create facility',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['name', 'url'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Test'),
                    new OA\Property(property: 'url', type: 'string', example: 'test-123'),
                ]
            )
        ),
        tags: ['Admin'],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable|ApiException */
    public function post(Request $request, CreateFacilityService $service): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string',
            'url' => [
                'required',
                'string',
                'unique:facilities,url',
                'max:15',
                'regex:/^(?!admin|user|api|system)[a-z][a-z0-9-]+.*[a-z0-9]$/',
            ],
        ]);

        $result = $service->handle($data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Patch(
        path: '/api/v1/admin/facility/{id}',
        summary: 'Update facility',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Test'),
                    new OA\Property(property: 'url', type: 'string', example: 'test-123'),
                ]
            )
        ),
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                description: 'Resource id',
                in: 'path',
                required: true,
                schema: new Schema(type: 'string', format: 'uuid', example: 'UUID'),
            )],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws Throwable|ApiException */
    public function patch(string $id, Request $request, UpdateFacilityService $service): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|sometimes|string',
            'url' => [
                'required',
                'sometimes',
                'string',
                'max:15',
                'regex:/^(?!admin|user|api|system)[a-z][a-z0-9-]+.*[a-z0-9]$/',
                Rule::unique('facilities', 'url')->ignore($id),
            ],
        ]);

        $service->handle($id, $data);

        return new JsonResponse(status: 200);
    }
}
