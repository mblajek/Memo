<?php

namespace App\Http\Controllers;

use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\AttributeResource;
use App\Http\Resources\DictionaryResource;
use App\Http\Resources\FacilityResource;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Facility;
use App\Services\System\TranslationsService;
use App\Utils\Date\DateHelper;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;
use Throwable;

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
        summary: 'All dictionaries',
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
        return DictionaryResource::collection(
            $dictionariesQuery->with(['positions', 'values', 'positions.values'])->get()
        );
    }

    #[OA\Get(
        path: '/api/v1/system/attribute/list',
        description: new PermissionDescribe(Permission::any),
        summary: 'All attributes',
        tags: ['System'],
        parameters: [new OA\Parameter(name: 'in', in: 'query')],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                new OA\Property(
                    property: 'data', type: 'array', items: new OA\Items(
                    ref: '#/components/schemas/AttributeResource'
                ),
                ),
            ])
            ),
        ]
    )]
    public function attributeList(): JsonResource
    {
        $attributesQuery = Attribute::query()->orderBy('default_order');
        $this->applyRequestIn($attributesQuery);
        return AttributeResource::collection($attributesQuery->get());
    }


    #[OA\Get(
        path: '/api/v1/system/status',
        description: new PermissionDescribe(Permission::any),
        summary: 'System status',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'OK', content: new  OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(properties: [
                    new OA\Property(property: 'randomUuid', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'currentDate', type: 'datetime'),
                    new OA\Property(property: 'commitHash', type: 'string'),
                    new OA\Property(property: 'commitDate', type: 'datetime'),
                    new OA\Property(property: 'backendHash', type: 'string'),
                    new OA\Property(property: 'frontendHash', type: 'string'),
                ])),
            ])),
        ]
    )]
    public function status(): JsonResponse
    {
        try {
            [$commitHash, $commitDate] = file(App::storagePath('app/git-version.txt'), FILE_IGNORE_NEW_LINES);
        } catch (Throwable) {
            [$commitHash, $commitDate] = [null, null];
        }
        [$backendHash, $frontendHash] = Cache::get('codeHash', [null, null]);
        if (!$backendHash || !$frontendHash) {
            [$backendHash, $frontendHash] = array_map(self::dirMd5(...), [App::path(), App::publicPath()]);
            Cache::put('codeHash', [$backendHash, $frontendHash], 15 /* 15s */);
        }
        return new JsonResponse([
            'data' => [
                'randomUuid' => Str::uuid()->toString(),
                'currentDate' => DateHelper::toZuluString(new DateTimeImmutable()),
                'commitHash' => $commitHash,
                'commitDate' => DateHelper::toZuluString(
                    DateTimeImmutable::createFromFormat('Y-m-d H:i:s P', $commitDate)
                        ->setTimezone(new DateTimeZone('UTC'))
                ),
                'backendHash' => $backendHash,
                'frontendHash' => $frontendHash,
            ],
        ]);
    }

    private static function dirMd5(string|array $paths): string
    {
        return md5(implode(array_map(fn($path) => is_dir($path) ? self::dirMd5(array_map(fn($file) => "$path/$file",
            array_filter(scandir($path), fn($file) => trim($file, '.') !== ''))) : md5_file($path),
            array_filter((array)$paths, is_readable(...)))));
    }
}
