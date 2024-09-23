<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Facility\FacilityUserStaffResource;
use App\Models\Member;
use App\Models\StaffMember;
use App\Models\User;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class StaffController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff);
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
        $this->applyRequestIn($query, 'users.id');

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
}
