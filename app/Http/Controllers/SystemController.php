<?php

namespace App\Http\Controllers;

use App\Http\Permissions\Permission;
use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use App\Services\System\TranslationsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Annotations\OpenApi as OA;

/** System endpoints without authorisation */
class SystemController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::any);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/system/translation/{lang}/list",
     *     tags={"System"},
     *     summary = "All translations",
     *     @OA\Parameter(name="lang", in="path", required=true, example="pl-pl", @OA\Schema(type="string")),
     *     @OA\Response(response="200", description="Translations JSON")
     * )
     */
    public function translationList(string $locale, TranslationsService $service): JsonResponse
    {
        return new JsonResponse($service->translationList($locale));
    }

    /**
     * @OA\Get(
     *     path="/api/v1/system/facility/list",
     *     tags={"System"},
     *     summary = "All facilities",
     *     @OA\Response(
     *        response="200",
     *        description="Facilities JSON",
     *        @OA\JsonContent(
     *            @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/FacilityResource")),
     *        ),
     *     ),
     * ),
     */
    public function facilityList(): JsonResource
    {
        return FacilityResource::collection(Facility::query()->get());
    }
}
