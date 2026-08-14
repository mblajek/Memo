<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\Concerns\PositionInput;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Facility;
use App\Models\Position;
use App\Services\Position\CreatePositionService;
use App\Services\Position\DeletePositionService;
use App\Services\Position\UpdatePositionService;
use App\Utils\OpenApi\FacilityParameter;
use App\Utils\OpenApi\UuidPathParameter;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;
use Throwable;

class FacilityPositionController extends ApiController
{
    use PositionInput;

    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
    }

    #[OA\Post(
        path: '/api/v1/facility/{facility}/admin/position',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Create facility dictionary position',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['dictionaryId', 'name', 'isDisabled'],
                properties: [
                    new OA\Property(property: 'defaultOrder', type: 'integer', description: 'Insert position; appended when omitted'),
                ],
            ),
        ),
        tags: ['Facility admin'],
        parameters: [new FacilityParameter()],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function post(CreatePositionService $service): JsonResponse
    {
        $facility = $this->getFacilityOrFail();
        $data = ['facility_id' => $facility->id, 'is_fixed' => false]
            + $this->positionInsertData($facility);
        return $this->createdIdResponse($service->handle($facility, $data));
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/admin/position/{position}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Update facility dictionary position',
        tags: ['Facility admin'],
        parameters: [new FacilityParameter(), new UuidPathParameter('position')],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function patch(
        Facility $facility,
        Position $position,
        UpdatePositionService $service,
    ): JsonResponse {
        $position->belongsToFacilityOrFail($facility);
        $service->handle($position, $facility, $this->positionPatchData($position, $facility));
        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/facility/{facility}/admin/position/{position}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Delete facility dictionary position',
        tags: ['Facility admin'],
        parameters: [new FacilityParameter(), new UuidPathParameter('position')],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function delete(
        Facility $facility,
        Position $position,
        DeletePositionService $service,
    ): JsonResponse {
        $position->belongsToFacilityOrFail($facility);
        $service->handle($position);
        return new JsonResponse();
    }
}
