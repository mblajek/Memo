<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Facility;
use App\Models\Member;
use App\Models\User;
use App\Rules\Valid;
use App\Services\Member\UpdateMemberService;
use App\Services\User\UpdateUserService;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class FacilityAdminController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/user/admin/{user}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Update facility admin',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Jan'),
                    new OA\Property(property: 'email', type: 'string', example: 'jan@jan.pl'),
                    new OA\Property(property: 'hasEmailVerified', type: 'bool', example: false),
                    new OA\Property(property: 'password', type: 'string', example: 'password'),
                    new OA\Property(property: 'passwordExpireAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
                    new OA\Property(property: 'otpRequiredAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
                    new OA\Property(property: 'hasOtpConfigured', type: 'bool', example: false),
                    new OA\Property(property: 'member', type: 'object', example: ['hasFacilityAdmin' => false]),
                ]
            )
        ),
        tags: ['Facility admin'],
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
        $member = $user->belongsToFacilityOrFail($facility, isFacilityAdmin: true);
        $isManagedByFacility = $user->managed_by_facility_id === $facility->id;

        $userKeys = ['name', 'email', 'has_email_verified', 'has_password', 'password', 'password_expire_at', 'otp_required_at', 'has_otp_configured'];
        $rules = [];
        foreach (User::getPatchResourceValidator($user) as $field => $rule) {
            $rules[$field] = $isManagedByFacility && in_array($field, $userKeys) ? $rule : 'missing';
        }
        $rules['member'] = Valid::array(keys: ['has_facility_admin'], sometimes: true);
        $rules['member.has_facility_admin'] = Member::getPatchValidator(['has_facility_admin'], $member)['has_facility_admin'];
        $userData = $this->validate($rules);
        $hasFacilityAdmin = $userData['member']['has_facility_admin'] ?? null;
        unset($userData['member']);
        $userAttributes = $userService->getAttributesAfterPatch($user, $userData);
        Validator::validate($userAttributes, User::getResourceValidator());

        DB::transaction(function () use ($isManagedByFacility, $userService, $memberService, $user, $member, $userAttributes, $hasFacilityAdmin) {
            // temporary solution, use "select for update" on "facilities" as mutex for other tables
            // todo: use lock or any other standard way to generate unique short_code
            Facility::query()->lockForUpdate()->count();
            if ($isManagedByFacility) {
                $userService->update($user, $userAttributes);
            }
            if ($hasFacilityAdmin !== null) {
                $memberService->update($member, ['has_facility_admin' => $hasFacilityAdmin]);
            }
        });
        return new JsonResponse();
    }
}
