<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\Concerns\DictionaryInput;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Dictionary;
use App\Models\Facility;
use App\Services\Dictionary\CreateDictionaryService;
use App\Services\Dictionary\DeleteDictionaryService;
use App\Services\Dictionary\UpdateDictionaryService;
use App\Utils\OpenApi\FacilityParameter;
use App\Utils\OpenApi\UuidPathParameter;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;
use Throwable;

class FacilityDictionaryController extends ApiController
{
    use DictionaryInput;

    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
    }

    #[OA\Post(
        path: '/api/v1/facility/{facility}/admin/dictionary',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Create facility dictionary',
        requestBody: new OA\RequestBody(content: new OA\JsonContent(required: ['name'])),
        tags: ['Facility admin'],
        parameters: [new FacilityParameter()],
        responses: [
            new OA\Response(response: 201, description: 'Created'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function post(CreateDictionaryService $service): JsonResponse
    {
        $facility = $this->getFacilityOrFail();
        $data = ['facility_id' => $facility->id, 'is_fixed' => false, 'is_extendable' => true]
            + $this->dictionaryInsertData($facility);
        return $this->createdIdResponse($service->handle($facility, $data));
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/admin/dictionary/{dictionary}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Update facility dictionary',
        tags: ['Facility admin'],
        parameters: [new FacilityParameter(), new UuidPathParameter('dictionary')],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function patch(
        Facility $facility,
        Dictionary $dictionary,
        UpdateDictionaryService $service,
    ): JsonResponse {
        $dictionary->belongsToFacilityOrFail($facility);
        $service->handle($dictionary, $facility, $this->dictionaryPatchData($dictionary, $facility));
        return new JsonResponse();
    }

    #[OA\Delete(
        path: '/api/v1/facility/{facility}/admin/dictionary/{dictionary}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Delete facility dictionary',
        tags: ['Facility admin'],
        parameters: [new FacilityParameter(), new UuidPathParameter('dictionary')],
        responses: [
            new OA\Response(response: 200, description: 'Deleted'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws ApiException|Throwable */
    public function delete(
        Facility $facility,
        Dictionary $dictionary,
        DeleteDictionaryService $service,
    ): JsonResponse {
        $dictionary->belongsToFacilityOrFail($facility);
        $service->handle($dictionary);
        return new JsonResponse();
    }
}
