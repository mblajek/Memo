<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\Facility\FacilityUserClientResource;
use App\Models\Client;
use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\MeetingAttendant;
use App\Models\Member;
use App\Models\User;
use App\Rules\MemberExistsRule;
use App\Rules\Valid;
use App\Services\Client\DeleteClientService;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

class ClientController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff)->except(['delete']);
        $this->permissionOneOf(Permission::facilityAdmin)->only(['delete']);
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

    #[OA\Post(
        path: '/api/v1/facility/{facility}/user/client',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Create client',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Jan'),
                    new OA\Property(property: 'client', type: 'object', example: ['birthDate' => '2012-12-20']),
                ]
            )
        ),
        tags: ['Facility client'],
        parameters: [new FacilityParameter()],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function post(): JsonResponse
    {
        $userValidator = User::getInsertValidator(['name']);
        $clientValidator = Client::getInsertValidator(['short_code'], attributesFacility: true);
        $userData = $this->validate($userValidator + $this->wrapClientValidator($clientValidator));

        $clientData = $userData['client'];
        $user = new User(['managed_by_facility_id' => $this->getFacilityOrFail()->id]);
        $user->fillOnly($userData, ['name']);
        $client = new Client();
        $client->fillOnly($clientData);
        $client->fillShortCode();
        $member = new Member(['facility_id' => $this->getFacilityOrFail()->id]);

        DB::transaction(function () use ($user, $client, $member, $clientData) {
            $user->save();
            $client->attrSave($this->getFacilityOrFail(), $clientData);
            $member->user_id = $user->id;
            $member->client_id = $client->id;
            $member->save();
        });
        return new JsonResponse(data: [
            'data' => ['id' => $user->id, 'clientId' => $client->id, 'shortCode' => $client->short_code],
        ], status: 201);
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/user/client/{user}',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Update client',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Jan'),
                    new OA\Property(property: 'client', type: 'object', example: ['birthDate' => '2012-12-20']),
                ]
            )
        ),
        tags: ['Facility client'],
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
    ): JsonResponse {
        $member = $user->belongsToFacilityOrFail(isClient: true);
        $client = $member->client;
        $managedByFacility = $user->managed_by_facility_id === $this->getFacilityOrFail()->id;

        $userValidator = $managedByFacility
            ? User::getPatchValidator(['name'], $user) : User::getProhibitedValidator(['name']);
        $clientValidator = Client::getPatchValidator(['short_code'], $client, attributesFacility: true);
        $userData = $this->validate($userValidator + $this->wrapClientValidator($clientValidator));
        $clientData = $userData['client'];

        if ($managedByFacility) {
            $user->fillOnly($userData, ['name']);
        }
        $client->fillOnly($clientData);
        $client->fillShortCode();
        DB::transaction(function () use ($user, $client, $clientData, $userData) {
            $user->save();
            $client->attrSave($this->getFacilityOrFail(), $clientData);
        });
        return new JsonResponse(data: ['data' => ['shortCode' => $client->short_code]]);
    }

    #[OA\Delete(
        path: '/api/v1/facility/{facility}/user/client/{user}',
        description: new PermissionDescribe([Permission::facilityAdmin]),
        summary: 'Delete or deduplicate client',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'duplicateOf', type: 'string', format: 'uuid', example: 'UUID'),
                ]
            )
        ),
        tags: ['Facility client'],
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
            new OA\Response(
                response: 200, description: 'Deleted', content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'clientDeleted', type: 'bool'),
                    new OA\Property(property: 'memberDeleted', type: 'bool'),
                    new OA\Property(property: 'userDeleted', type: 'bool'),
                ]
            )
            ),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
            new OA\Response(response: 409, description: 'Conflict'),
        ]
    )] /** @throws ApiException */
    public function delete(
        DeleteClientService $deleteClientService,
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        User $user,
    ): JsonResponse {
        $member = $user->belongsToFacilityOrFail(isClient: true);
        if (MeetingAttendant::query()->where('meeting_attendants.user_id', '=', $user->id)->exists()) {
            $duplicateOf = $this->validate([
                'duplicate_of' => Valid::uuid([
                    new MemberExistsRule(AttendanceType::Client),
                    Rule::notIn($user->id),
                ]),
            ])['duplicate_of'];
            $deleted = $deleteClientService->deduplicate($member, $duplicateOf);
        } else {
            $deleted = $deleteClientService->delete($member);
        }
        return new JsonResponse($deleted);
    }

    private function wrapClientValidator(array $clientValidator): array
    {
        return [
                'client' => Valid::array(
                    keys: array_filter(array_keys($clientValidator), fn(string $key) => !str_ends_with($key, '*'))
                ),
            ] + array_combine(
                array_map(fn(string $key) => "client.$key", array_keys($clientValidator)),
                $clientValidator,
            );
    }
}
