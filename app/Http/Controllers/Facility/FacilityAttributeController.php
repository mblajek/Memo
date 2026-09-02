<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\Concerns\AttributeInput;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Attribute;
use App\Models\Facility;
use App\Services\Attribute\CreateAttributeService;
use App\Services\Attribute\DeleteAttributeService;
use App\Services\Attribute\UpdateAttributeService;
use App\Utils\OpenApi\FacilityParameter;
use App\Utils\OpenApi\UuidPathParameter;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;
use Throwable;

class FacilityAttributeController extends ApiController
{
    use AttributeInput;

    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
    }

    #[OA\Post(
        path: '/api/v1/facility/{facility}/admin/attribute',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Create facility attribute',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: [
                    'model', 'name', 'apiName', 'type', 'dictionaryId',
                    'isMultiValue', 'requirementLevel', 'description',
                ],
                properties: [
                    new OA\Property(property: 'model', type: 'string', description: 'The entity the attribute is for, e.g. "client"'),
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
    public function post(CreateAttributeService $service): JsonResponse
    {
        $data = ['facility_id' => $this->getFacilityOrFail()->id, 'is_fixed' => false]
            + $this->attributeInsertData();
        return $this->createdIdResponse($service->handle($data));
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/admin/attribute/{attribute}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Update facility attribute',
        tags: ['Facility admin'],
        parameters: [new FacilityParameter(), new UuidPathParameter('attribute')],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function patch(
        Facility $facility,
        Attribute $attribute,
        UpdateAttributeService $service,
    ): JsonResponse {
        $attribute->belongsToFacilityOrFail($facility);
        $service->handle($attribute, $this->attributePatchData($attribute));
        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/facility/{facility}/admin/attribute/{attribute}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Delete facility attribute',
        tags: ['Facility admin'],
        parameters: [new FacilityParameter(), new UuidPathParameter('attribute')],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function delete(
        Facility $facility,
        Attribute $attribute,
        DeleteAttributeService $service,
    ): JsonResponse {
        $attribute->belongsToFacilityOrFail($facility);
        $service->handle($attribute);
        return new JsonResponse();
    }
}
