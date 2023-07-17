<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Member;
use App\Services\Member\CreateMemberService;
use App\Services\Member\UpdateMemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;
use Throwable;

class AdminMemberController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);
    }

    #[OA\Post(
        path: '/api/v1/admin/member',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Create member',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['userId', 'facilityId' , 'hasFacilityAdmin'],
                properties: [
                    new OA\Property(property: 'userId', type: 'string', example: 'UUID'),
                    new OA\Property(property: 'facilityId', type: 'string', example: 'UUID'),
                    new OA\Property(property: 'hasFacilityAdmin', type: 'bool', example: true),
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
    public function post(Request $request, CreateMemberService $service): JsonResponse
    {
        $data = $request->validate([
            'user_id' => [
                'required',
                'uuid',
                'exists:users,id',
                Rule::unique('members')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request['user_id'])
                        ->where('facility_id', $request['facility_id']);
                }),
            ],
            'facility_id' => 'required|uuid|exists:facilities,id',
            'has_facility_admin' => 'required|bool',
        ]);

        $result = $service->handle($data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Patch(
        path: '/api/v1/admin/member/{member}',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Update member',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'userId', type: 'string', example: 'UUID'),
                    new OA\Property(property: 'facilityId', type: 'string', example: 'UUID'),
                    new OA\Property(property: 'hasFacilityAdmin', type: 'bool', example: true),
                ]
            )
        ),
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(
                name: 'member',
                description: 'Member id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            )],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws Throwable|ApiException */
    public function patch(Member $member, Request $request, UpdateMemberService $service): JsonResponse
    {
        $data = $request->validate([
            'user_id' => [
                'sometimes',
                'uuid',
                'exists:users,id',
                Rule::unique('members')->where(function ($query) use ($request) {
                    return $query->where('user_id', $request['user_id'])
                        ->where('facility_id', $request['facility_id']);
                })->ignore($member->id),
            ],
            'facility_id' => 'sometimes|required|uuid|exists:facilities,id',
            'has_facility_admin' => 'sometimes|required|bool',
        ]);

        $service->handle($member, $data);

        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/admin/member/{member}',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Delete member',
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(
                name: 'member',
                description: 'Member id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            )],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable|ApiException */
    public function delete(Member $member): JsonResponse
    {
        $member->deleteOrFail();

        return new JsonResponse();
    }
}
