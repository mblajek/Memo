<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Facility\FacilityUserClientResource;
use App\Models\Client;
use App\Models\User;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class ClientController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff);
    }

    #[OA\Get(
        path: '/api/v1/facility/{facility}/user/client/list',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'All clients',
        tags: ['Facility client'],
        parameters: [new FacilityParameter(), new OA\Parameter(name: 'in', in: 'query')],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(
                    ref: '#/components/schemas/FacilityUserClientResource'
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
            ->join('clients', 'clients.id', 'members.client_id')
            ->where('members.facility_id', $this->getFacilityOrFail()->id);
        $this->applyRequestIn($query, 'users.id');

        $users = User::query()->from($query->clone()->addSelect('users.*'))->get();
        $clients = Client::query()->from($query->clone()->addSelect('clients.*'))
            ->with(['values'])->get()->keyBy('member_id');
        foreach ($users as $user) {
            $user->client = $clients->offsetGet($user->member_id);
        }
        return FacilityUserClientResource::collection($users);
    }
}
