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
use App\Models\LogEntry;
use App\Services\Database\DatabaseDumpService;
use App\Services\System\LogService;
use App\Services\System\TranslationsService;
use App\Utils\Date\DateHelper;
use App\Utils\Nullable;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $this->permissionOneOf(Permission::unverified, Permission::verified)->only('log', 'facilityList');
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
        description: new PermissionDescribe([Permission::unverified, Permission::verified]),
        summary: 'All facilities',
        tags: ['System'],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new OA\JsonContent(properties: [
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
                response: 200, description: 'OK', content: new OA\JsonContent(properties: [
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
                response: 200, description: 'OK', content: new OA\JsonContent(properties: [
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
            new OA\Response(response: 200, description: 'OK', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', type: 'array', items: new OA\Items(properties: [
                    new OA\Property(property: 'version', type: 'string', example: '1.2.3'),
                    new OA\Property(property: 'appEnv', type: 'string', example: 'production'),
                    new OA\Property(property: 'appEnvColor', type: 'string', example: '#AABBCC', nullable: true),
                    new OA\Property(property: 'appEnvFgColor', type: 'string', example: '#FFFFFF', nullable: true),
                    new OA\Property(property: 'randomUuid', type: 'string', format: 'uuid', example: 'UUID'),
                    new OA\Property(property: 'currentDate', type: 'datetime'),
                    new OA\Property(property: 'commitHash', type: 'string', nullable: true),
                    new OA\Property(property: 'commitDate', type: 'datetime', nullable: true),
                    new OA\Property(property: 'lastDump', type: 'datetime', nullable: true),
                    new OA\Property(property: 'cpu15m', type: 'float', nullable: true),
                ])),
            ])),
        ]
    )]
    public function status(): JsonResponse
    {
        $cache = Cache::get('system_status');
        if (is_array($cache) && count($cache) === 4) {
            [$commitHash, $commitDateZulu, $cpu15m, $lastDump, $isRc] = $cache;
        } else {
            try {
                [$commitHash, $commitDate, $branch] = file(
                    App::storagePath('app/git-version.txt'),
                    FILE_IGNORE_NEW_LINES,
                );
                $isRc = str_starts_with($branch, '## RC-');
                $commitDateZulu = DateHelper::toZuluString(
                    DateTimeImmutable::createFromFormat('Y-m-d H:i:s P', $commitDate)
                        ->setTimezone(new DateTimeZone('UTC'))
                );
                ob_start();
                system('uptime');
                $cpu15m = Str::match('/[.0-9]+$/', trim(ob_get_clean() ?? ''));
                $cpu15m = strlen($cpu15m) ? floatval($cpu15m) : null;
                $lastDump = Nullable::call(DatabaseDumpService::lastDumpDatetime(), DateHelper::toZuluString(...));
            } catch (Throwable) {
                [$commitHash, $commitDateZulu, $cpu15m, $lastDump, $isRc] = [null, null, null, null, null];
            }
            Cache::put('system_status', [$commitHash, $commitDateZulu, $cpu15m, $lastDump, $isRc], 15 /* 15s */);
        }
        return new JsonResponse([
            'data' => [
                'version' => self::VERSION . ($isRc ? ' RC' : ''),
                'appEnv' => env('APP_ENV'),
                'appEnvColor' => env('APP_ENV_COLOR') ?: null,
                'appEnvFgColor' => env('APP_ENV_FG_COLOR') ?: null,
                'randomUuid' => Str::uuid()->toString(),
                'currentDate' => DateHelper::toZuluString(new DateTimeImmutable()),
                'commitHash' => $commitHash,
                'commitDate' => $commitDateZulu,
                'lastDump' => $lastDump,
                'cpu15m' => $cpu15m,
            ],
        ]);
    }

    #[OA\Post(
        path: '/api/v1/system/log',
        description: new PermissionDescribe([Permission::unverified, Permission::verified]),
        summary: 'Add log entry',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['logLevel', 'message'],
                properties: [
                    new OA\Property(property: 'source', type: 'string', example: 'api_fe_js_error'),
                    new OA\Property(property: 'logLevel', type: 'string', enum: LogEntry::LEVELS, example: 'info'),
                    new OA\Property(property: 'message', type: 'string', example: 'message', nullable: true),
                    new OA\Property(property: 'context', type: 'string', example: null, nullable: true),
                ]
            )
        ),
        tags: ['System'],
        responses: [
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
                ]),
            ])),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ],
    )] /** @throws Throwable */
    public function log(
        LogService $logService,
        Request $request,
    ): JsonResponse {
        $data = $this->validate(LogEntry::getInsertValidator(['source', 'log_level', 'message', 'context']));
        $logEntryIsd = $logService->addEntry(
            request: $request,
            source: $data['source'],
            logLevel: $data['log_level'],
            message: $data['message'] ?? null,
            context: $data['context'] ?? null,
        );
        return new JsonResponse(['data' => ['id' => $logEntryIsd]], status: 201);
    }
}
