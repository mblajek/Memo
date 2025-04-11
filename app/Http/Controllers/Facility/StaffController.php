<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Facility\FacilityUserStaffResource;
use App\Models\Facility;
use App\Models\Member;
use App\Models\StaffMember;
use App\Models\User;
use App\Rules\Valid;
use App\Services\Member\UpdateMemberService;
use App\Services\User\UpdateUserService;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class StaffController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff);
        $this->permissionOneOf(Permission::facilityAdmin)->only('patch');
    }

    #[OA\Get(
        path: '/api/v1/facility/{facility}/user/staff/list',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'All staff',
        tags: ['Facility staff'],
        parameters: [new FacilityParameter(), new OA\Parameter(name: 'in', in: 'query')],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(
                    ref: '#/components/schemas/FacilityUserStaffResource'
                )
                ),
            ])
            ),
        ]
    )]
    public function list(): JsonResource
    {
        $query = DB::query()->select('members.id as member_id')->from('users')
            ->join('members', 'members.user_id', 'users.id')
            ->join('staff_members', 'staff_members.id', 'members.staff_member_id')
            ->where('members.facility_id', $this->getFacilityOrFail()->id);
        $this->applyRequestIn($query, 'users.id', required: true);

        $users = User::query()->from($query->clone()->addSelect('users.*'))->get();
        $members = Member::query()->from($query->clone()->select('members.*'))->get()->keyBy('id');
        $staff = StaffMember::query()->from($query->clone()->addSelect('staff_members.*'))
            /*->with(['values'])*/ ->get()->keyBy('member_id');
        foreach ($users as $user) {
            $user->staff = $staff->offsetGet($user->member_id);
            $user->staff->has_facility_admin = $members->offsetGet($user->member_id)->facility_admin_grant_id !== null;
        }
        return FacilityUserStaffResource::collection($users);
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/user/staff/{user}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Update staff',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Jan'),
                    new OA\Property(property: 'email', type: 'string', example: 'jan@jan.pl'),
                    new OA\Property(property: 'hasEmailVerified', type: 'bool', example: false),
                    new OA\Property(property: 'password', type: 'string', example: 'password'),
                    new OA\Property(property: 'passwordExpireAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
                    new OA\Property(property: 'staff', type: 'object', example: [
                        'deactivatedAt' => '2012-12-20T00:00:00Z',
                        'hasFacilityAdmin' => true,
                    ]),
                ]
            )
        ),
        tags: ['Facility staff'],
        parameters: [
            new FacilityParameter(),
            new OA\Parameter(
                name: 'user',
                description: 'User id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException */
    public function patch(
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        User $user,
        UpdateUserService $userService,
        UpdateMemberService $memberService,
    ): JsonResponse {
        $member = $user->belongsToFacilityOrFail($facility, isStaff: true);
        $staff = $member->staffMember;
        $isManagedByFacility = $user->managed_by_facility_id === $facility->id;

        $userKeys = ['name', 'email', 'has_email_verified', 'has_password', 'password', 'password_expire_at'];
        $rules = [];
        foreach (User::getPatchResourceValidator($user) as $field => $rule) {
            $rules[$field] = $isManagedByFacility && in_array($field, $userKeys) ? $rule : 'missing';
        }
        $rules['staff'] = Valid::array(keys: ['deactivated_at', 'has_facility_admin'], sometimes:true);
        $rules['staff.deactivated_at'] = Valid::datetime(nullable: true, sometimes: true);
        $rules['staff.has_facility_admin'] = Member::getPatchValidator(['has_facility_admin'], $member)['has_facility_admin'];
        $userData = $this->validate($rules);
        $hasFacilityAdmin = $userData['staff']['has_facility_admin'] ?? null;
        $staffData = $userData['staff'] ?? [];
        unset($userData['staff']);
        unset($staffData['has_facility_admin']);
        $userAttributes = $userService->getAttributesAfterPatch($user, $userData);
        Validator::validate($userAttributes, User::getResourceValidator());

        DB::transaction(function () use (
            $isManagedByFacility, $userService, $memberService, $user, $member, $staff, $staffData, $userAttributes, $hasFacilityAdmin) {
            // temporary solution, use "select for update" on "facilities" as mutex for other tables
            // todo: use lock or any other standard way to generate unique short_code
            Facility::query()->lockForUpdate()->count();
            if ($isManagedByFacility) {
                $userService->update($user, $userAttributes);
            }
            $staff->update($staffData);
            if ($hasFacilityAdmin !== null) {
                $memberService->update($member, ['has_facility_admin' => $hasFacilityAdmin]);
            }
        });
        return new JsonResponse();
    }
}
