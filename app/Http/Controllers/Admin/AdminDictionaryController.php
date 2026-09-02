<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\Concerns\DictionaryInput;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Dictionary;
use App\Services\Dictionary\CreateDictionaryService;
use App\Services\Dictionary\DeleteDictionaryService;
use App\Services\Dictionary\UpdateDictionaryService;
use App\Utils\OpenApi\UuidPathParameter;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;
use Throwable;

/** Global (cross-facility, system-wide) dictionary management for developers / global admins. */
class AdminDictionaryController extends ApiController
{
    use DictionaryInput;

    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin, Permission::developer);
    }

    #[OA\Post(
        path: '/api/v1/admin/dictionary',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Create dictionary',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(required: ['facilityId', 'name', 'isExtendable']),
        ),
        tags: ['Admin'],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function post(CreateDictionaryService $service): JsonResponse
    {
        $facility = $this->facilityOrNull(
            $this->validate(Dictionary::getInsertValidator(['facility_id']))['facility_id'],
        );
        $data = ['facility_id' => $facility?->id]
            + $this->dictionaryInsertData($facility, ['is_extendable']);
        return $this->createdIdResponse($service->handle($facility, $data));
    }

    #[OA\Patch(
        path: '/api/v1/admin/dictionary/{dictionary}',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Update dictionary',
        tags: ['Admin'],
        parameters: [new UuidPathParameter('dictionary')],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function patch(Dictionary $dictionary, UpdateDictionaryService $service): JsonResponse
    {
        $facility = $this->facilityOrNull($dictionary->facility_id);
        $service->handle(
            $dictionary,
            $facility,
            $this->dictionaryPatchData($dictionary, $facility, ['is_extendable']),
        );
        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/admin/dictionary/{dictionary}',
        description: new PermissionDescribe([Permission::globalAdmin, Permission::developer]),
        summary: 'Delete dictionary',
        tags: ['Admin'],
        parameters: [new UuidPathParameter('dictionary')],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function delete(Dictionary $dictionary, DeleteDictionaryService $service): JsonResponse
    {
        $service->handle($dictionary);
        return new JsonResponse();
    }
}
