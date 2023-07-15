<?php

namespace App\Http\Controllers;

use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\DictionaryResource;
use App\Http\Resources\FacilityResource;
use App\Models\Dictionary;
use App\Models\Facility;
use App\Services\System\TranslationsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

/** System endpoints without authorisation */
class SystemController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::any);
    }

    #[OA\Get(
        path: '/api/v1/system/translation/{lang}/list',
        description: new PermissionDescribe(Permission::any),
        summary: 'All translations',
        tags: ['System'],
        parameters: [
            new OA\Parameter(
                name: 'lang', in: 'path', required: true, schema: new OA\Schema(schema: 'string'), example: 'pl-pl'
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
        ]
    )]
    public function translationList(string $locale, TranslationsService $service): JsonResponse
    {
        return new JsonResponse($service->translationList($locale));
    }

    #[OA\Get(
        path: '/api/v1/system/facility/list',
        description: new PermissionDescribe(Permission::any),
        summary: 'All facilities',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/FacilityResource'),
                ),
            ])
            ),
        ]
    )]
    public function facilityList(): JsonResource
    {
        return FacilityResource::collection(Facility::query()->get());
    }

    #[OA\Get(
        path: '/api/v1/system/dictionary/list',
        description: new PermissionDescribe(Permission::any),
        summary: 'All facilities',
        tags: ['System'],
        parameters: [new OA\Parameter(name: 'in', in: 'query')],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(
                    ref: '#/components/schemas/DictionaryResource'
                ),
                ),
            ])
            ),
        ]
    )]
    public function dictionaryList(): JsonResource
    {
        $dictionariesQuery = Dictionary::query();
        $this->applyRequestIn($dictionariesQuery);
        return DictionaryResource::collection($dictionariesQuery->with(['positions'])->get());
    }
}
