<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Member;
use App\Rules\Valid;
use App\Services\Member\UpdateMemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                required: ['userId', 'facilityId', 'hasFacilityAdmin', 'isFacilityClient', 'isFacilityStaff'],
                properties: [
                    new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'facilityId', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'hasFacilityAdmin', type: 'bool', example: true),
                    new OA\Property(property: 'isFacilityClient', type: 'bool', example: true),
                    new OA\Property(property: 'isFacilityStaff', type: 'bool', example: true),
                ]
            )
        ),
        tags: ['Admin'],
        responses: [
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
                ]),
            ])),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable|ApiException */
    public function post(Request $request, UpdateMemberService $service): JsonResponse
    {
        $data = $this->validate(
            [
                'user_id' => [
                    ...Valid::uuid(),
                    Rule::unique('members')->where(fn($query) => //
                    $query->where('user_id', $request['user_id'])->where('facility_id', $request['facility_id'])),
                ],
            ] + Member::getInsertValidator(
                ['facility_id', 'has_facility_admin', 'is_facility_client', 'is_facility_staff']
            )
        );

        $result = $service->create($data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Patch(
        path: '/api/v1/admin/member/{member}',
        description: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Update member',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'hasFacilityAdmin', type: 'bool', example: true),
                    new OA\Property(property: 'isFacilityClient', type: 'bool', example: true),
                    new OA\Property(property: 'isFacilityStaff', type: 'bool', example: true),
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
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws Throwable|ApiException */
    public function patch(Member $member, Request $request, UpdateMemberService $service): JsonResponse
    {
        $data = $this->validate(
            Member::getPatchValidator(['has_facility_admin', 'is_facility_client', 'is_facility_staff'], $member)
        );

        $service->update($member, $data);

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
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws Throwable */
    public function delete(Member $member): JsonResponse
    {
        DB::transaction(function () use ($member) {
            $member->client()?->delete();
            $member->staffMember()?->delete();
            $member->delete();
        });

        return new JsonResponse();
    }
}
