<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\Concerns\AttributeInput;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Attribute;
use App\Services\Attribute\CreateAttributeService;
use App\Services\Attribute\DeleteAttributeService;
use App\Services\Attribute\UpdateAttributeService;
use App\Utils\OpenApi\UuidPathParameter;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;
use Throwable;

/** Global (cross-facility, system-wide) attribute management for developers / global admins. */
class AdminAttributeController extends ApiController
{
    use AttributeInput;

    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin, Permission::developer);
    }

    #[OA\Post(
        path: '/api/v1/admin/attribute',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Create attribute',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: [
                    'facilityId', 'model', 'name', 'apiName', 'type', 'dictionaryId',
                    'isMultiValue', 'requirementLevel', 'description',
                ],
                properties: [
                    new OA\Property(property: 'model', type: 'string', description: 'The entity the attribute is for, e.g. "client"'),
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
    public function post(CreateAttributeService $service): JsonResponse
    {
        $data = $this->attributeInsertData(['facility_id']);
        return $this->createdIdResponse($service->handle($data));
    }

    #[OA\Patch(
        path: '/api/v1/admin/attribute/{attribute}',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Update attribute',
        tags: ['Admin'],
        parameters: [new UuidPathParameter('attribute')],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function patch(Attribute $attribute, UpdateAttributeService $service): JsonResponse
    {
        $service->handle($attribute, $this->attributePatchData($attribute));
        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/admin/attribute/{attribute}',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Delete attribute',
        tags: ['Admin'],
        parameters: [new UuidPathParameter('attribute')],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function delete(Attribute $attribute, DeleteAttributeService $service): JsonResponse
    {
        $service->handle($attribute);
        return new JsonResponse();
    }
}
