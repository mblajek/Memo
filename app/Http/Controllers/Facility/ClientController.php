<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Facility\FacilityUserClientResource;
use App\Models\Client;
use App\Models\Facility;
use App\Models\Member;
use App\Models\User;
use App\Rules\Valid;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
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

    // todo: extract into service, openApi
    public function post(): JsonResponse
    {
        $userValidator = User::getInsertValidator(['name']);
        $clientValidator = Client::getInsertValidator([], attributesFacility: true);
        $userData = $this->validate($userValidator + $this->wrapClientValidator($clientValidator));

        $clientData = $userData['client'];
        $user = new User(['managed_by_facility_id' => $this->getFacilityOrFail()->id]);
        $user->fillOnly($userData, ['name']);
        $client = new Client();
        $client->fillOnly($clientData);
        $member = new Member(['facility_id' => $this->getFacilityOrFail()->id]);

        DB::transaction(function () use ($user, $client, $member, $clientData) {
            $user->save();
            $client->attrSave($this->getFacilityOrFail(), $clientData);
            $member->user_id = $user->id;
            $member->client_id = $client->id;
            $member->save();
        });
        return new JsonResponse(data: ['data' => ['id' => $user->id]], status: 201);
    }

    // todo: extract into service, openApi
    public function patch(
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        string $user,
    ): JsonResponse {
        $query = DB::query()->select('members.id as member_id')->from('users')
            ->join('members', 'members.user_id', 'users.id')
            ->join('clients', 'clients.id', 'members.client_id')
            ->where('members.facility_id', $this->getFacilityOrFail()->id)
            ->where('users.id', $user);
        /** @var User $userObject */
        $userObject = User::query()->from($query->clone()->addSelect('users.*'))->firstOrFail();
        /** @var Client $clientObject */
        $clientObject = Client::query()->from($query->clone()->addSelect('clients.*'))
            ->with(['values'])->firstOrFail();

        $managedByFacility = $userObject->managed_by_facility_id === $this->getFacilityOrFail()->id;

        $userValidator = $managedByFacility ? User::getPatchValidator(['name',], $userObject) : [];
        $clientValidator = Client::getPatchValidator([], $clientObject, attributesFacility: true);
        $userData = $this->validate($userValidator + $this->wrapClientValidator($clientValidator));

        $clientData = $userData['client'];
        if ($managedByFacility) {
            $userObject->fillOnly($userData, ['name']);
        }
        $clientObject->fillOnly($clientData);
        DB::transaction(function () use ($userObject, $clientObject, $clientData, $userData) {
            $userObject->save();
            $clientObject->attrSave($this->getFacilityOrFail(), $clientData);
        });
        return new JsonResponse();
    }

    private function wrapClientValidator(array $clientValidator): array
    {
        return [
                'client' => Valid::array(keys: array_filter(array_keys($clientValidator), fn(string $key) => //
                !str_ends_with($key, '*')))
            ] + array_combine(
                array_map(fn(string $key) => "client.$key", array_keys($clientValidator)),
                $clientValidator,
            );
    }
}
