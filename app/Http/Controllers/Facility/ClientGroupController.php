<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\ClientGroup\ClientGroupResource;
use App\Models\ClientGroup;
use App\Models\GroupClient;
use App\Models\Facility;
use App\Models\MeetingAttendant;
use App\Services\Client\ClientGroupService;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;
use Throwable;

class ClientGroupController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin, Permission::facilityStaff);
    }

    #[OA\Post(
        path: '/api/v1/facility/{facility}/client-group',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Create client group',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['typeDictId', 'date', 'startDayminute', 'durationMinutes', 'statusDictId', 'isRemote'],
                properties: [
                    new OA\Property(property: 'notes', type: 'string', example: null, nullable: true),
                    new OA\Property(
                        property: 'clients', type: 'array', items: new OA\Items(
                        required: ['userId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(property: 'role', type: 'string', example: null, nullable: true),
                        ]
                    )
                    ),
                ]
            )
        ),
        tags: ['Facility client'],
        parameters: [new FacilityParameter()],
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
    public function post(ClientGroupService $clientGroupService): JsonResponse
    {
        $data = $this->validate(
            ClientGroup::getInsertValidator([
                'notes',
                'clients',
                'clients.*',
                'clients.*.user_id',
                'clients.*.role',
            ])
        );
        $result = $clientGroupService->create($this->getFacilityOrFail(), $data);

        return new JsonResponse(data: ['data' => ['id' => $result]], status: 201);
    }

    #[OA\Get(
        path: '/api/v1/facility/{facility}/client-group/list',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Get client groups',
        tags: ['Facility client'],
        parameters: [new FacilityParameter(), new OA\Parameter(name: 'in', in: 'query')],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(
                    ref: '#/components/schemas/ClientGroupResource'
                ),
                ),
            ])
            ),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function list(Facility $facility): JsonResource
    {
        $clientGroupsQuery = ClientGroup::query()->where('facility_id', $facility->id);
        $this->applyRequestIn($clientGroupsQuery);
        $this->getRequestIn();
        $clientGroupsQuery->select('client_groups.*')->selectSub(
            'select count(1) from `meeting_attendants`'
            . ' where `meeting_attendants`.`client_group_id` = `client_groups`.`id`',
            'meeting_count',
        );
        return ClientGroupResource::collection($clientGroupsQuery->with(['groupClients'])->get());
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/client-group/{clientGroup}',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Update client group',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'notes', type: 'string', example: '', nullable: true),
                    new OA\Property(
                        property: 'clients', type: 'array', items: new OA\Items(
                        required: ['userId'],
                        properties: [
                            new OA\Property(property: 'userId', type: 'string', format: 'uuid', example: 'UUID'),
                            new OA\Property(property: 'role', type: 'string', example: null, nullable: true),
                        ]
                    )
                    ),
                ]
            )
        ),
        tags: ['Facility client'],
        parameters: [
            new FacilityParameter(),
            new OA\Parameter(
                name: 'clientGroup',
                description: 'Client group id',
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
        ClientGroupService $clientGroupService,
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        ClientGroup $clientGroup,
    ): JsonResponse {
        $clientGroup->belongsToFacilityOrFail();
        $data = $this->validate(
            ClientGroup::getPatchValidator([
                'notes',
                'clients',
            ], $clientGroup) + ClientGroup::getInsertValidator([
                'clients.*',
                'clients.*.user_id',
                'clients.*.role',
            ])
        );
        $clientGroupService->patch($clientGroup, $data);
        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/facility/{facility}/client-group/{clientGroup}',
        description: new PermissionDescribe([Permission::facilityAdmin, Permission::facilityStaff]),
        summary: 'Delete client group',
        tags: ['Facility client'],
        parameters: [
            new FacilityParameter(),
            new OA\Parameter(
                name: 'clientGroup',
                description: 'Client group id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException */
    public function delete(
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        ClientGroup $clientGroup,
    ): JsonResponse {
        $clientGroup->belongsToFacilityOrFail();
        DB::transaction(function () use ($clientGroup) {
            MeetingAttendant::query()->where('client_group_id', $clientGroup->id)->update(['client_group_id' => null]);
            GroupClient::query()->where('client_group_id', $clientGroup->id)->delete();
            ClientGroup::query()->where('id', $clientGroup->id)->delete();
        });
        return new JsonResponse();
    }
}
