<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\Concerns\PositionInput;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Position;
use App\Services\Position\CreatePositionService;
use App\Services\Position\DeletePositionService;
use App\Services\Position\UpdatePositionService;
use App\Utils\OpenApi\UuidPathParameter;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;
use Throwable;

/** Global (cross-facility, system-wide) dictionary position management for developers / global admins. */
class AdminPositionController extends ApiController
{
    use PositionInput;

    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin, Permission::developer);
    }

    #[OA\Post(
        path: '/api/v1/admin/position',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Create dictionary position',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['facilityId', 'dictionaryId', 'name', 'isDisabled'],
                properties: [
                    new OA\Property(property: 'defaultOrder', type: 'integer', description: 'Insert position; appended when omitted'),
                ],
            ),
        ),
        tags: ['Admin'],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function post(CreatePositionService $service): JsonResponse
    {
        $facility = $this->facilityOrNull(
            $this->validate(Position::getInsertValidator(['facility_id']))['facility_id'],
        );
        $data = ['facility_id' => $facility?->id] + $this->positionInsertData($facility);
        return $this->createdIdResponse($service->handle($facility, $data));
    }

    #[OA\Patch(
        path: '/api/v1/admin/position/{position}',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Update dictionary position',
        tags: ['Admin'],
        parameters: [new UuidPathParameter('position')],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function patch(Position $position, UpdatePositionService $service): JsonResponse
    {
        $facility = $this->facilityOrNull($position->facility_id);
        $service->handle($position, $facility, $this->positionPatchData($position, $facility));
        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/admin/position/{position}',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Delete dictionary position',
        tags: ['Admin'],
        parameters: [new UuidPathParameter('position')],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function delete(Position $position, DeletePositionService $service): JsonResponse
    {
        $service->handle($position);
        return new JsonResponse();
    }
}
