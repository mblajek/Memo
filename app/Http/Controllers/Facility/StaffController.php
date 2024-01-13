<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Facility\FacilityUserStaffResource;
use App\Models\User;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\Resources\Json\JsonResource;
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
                response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
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
        $usersQuery = User::query();

        $usersQuery->select('users.*');
        $usersQuery->join('members', 'members.user_id', 'users.id');
        $usersQuery->where('members.facility_id', $this->getFacilityOrFail()->id);
        $usersQuery->whereNotNull('members.staff_member_id');

        $this->applyRequestIn($usersQuery, 'users.id');
        return FacilityUserStaffResource::collection($usersQuery->get());
    }
}
