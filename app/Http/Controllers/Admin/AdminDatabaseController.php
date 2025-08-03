<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\DbDump;
use App\Rules\Valid;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpsService;
use App\Tquery\OpenApi\OpenApiGet;
use App\Tquery\OpenApi\OpenApiPost;
use App\Tquery\Tables\AdminDbDumpsTquery;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper as DMH;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use OpenApi\Attributes as OA;
use stdClass;

class AdminDatabaseController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::globalAdmin);

        if (!DatabaseDumpHelper::dumpsEnabled()) {
            ExceptionFactory::dbDumpsDisabled()->throw();
        }
    }

    #[OA\Post(
        path: '/api/v1/admin/db-dump',
        description: new PermissionDescribe([Permission::globalAdmin]),
        summary: 'Create database dump',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['isFromRc'],
                properties: [
                    new OA\Property(property: 'isFromRc', type: 'bool', example: false),
                ],
            ),
        ),
        tags: ['Admin'],
        responses: [
            new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'id', type: 'string', format: 'uuid', example: 'UUID'),
                ]),
            ])),
        ]
    )]
    public function create(
        DatabaseDumpsService $service,
    ): JsonResponse {
        $isFromRc = $this->validate([
            'is_from_rc' => Valid::bool(Config::get('app.db.rc_password') ? [] : ['declined']),
        ])['is_from_rc'];

        $dbDumpJob = $service->create(isFromRc: $isFromRc);
        Bus::dispatchAfterResponse($dbDumpJob);

        return new JsonResponse(['data' => ['id' => $dbDumpJob->dbDump->id]]);
    }

    #[OA\Post(
        path: '/api/v1/admin/db-dump/{dbDump}/restore',
        description: new PermissionDescribe([Permission::globalAdmin]),
        summary: 'Restore database dump',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['isToRc'],
                properties: [
                    new OA\Property(property: 'isToRc', type: 'bool', example: true),
                ],
            ),
        ),
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(
                name: 'dbDump',
                description: 'Database dump id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
        ]
    )]
    public function restore(
        DatabaseDumpsService $service,
        DbDump $dbDump,
    ): JsonResponse {
        $isToRc = $this->validate([
            'is_to_rc' => Valid::bool(Config::get('app.db.rc_password') ? [] : ['declined']),
        ])['is_to_rc'];

        $dbRestoreJob = $service->restore($dbDump, isToRc: $isToRc);
        Bus::dispatchAfterResponse($dbRestoreJob);

        return new JsonResponse();
    }

    #[OpenApiGet(
        path: '/api/v1/admin/db-dump/tquery',
        permissions: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Database dumps tquery',
        tag: 'Admin',
    )]
    public function dbDumpsTqueryGet(
        AdminDbDumpsTquery $tquery,
    ): JsonResponse {
        return new JsonResponse($tquery->getConfigArray());
    }

    #[OpenApiPost(
        path: '/api/v1/admin/db-dump/tquery',
        permissions: new PermissionDescribe(Permission::globalAdmin),
        summary: 'Database dumps tquery',
        tag: 'Admin',
    )]
    public function dbDumpsTqueryPost(
        AdminDbDumpsTquery $tquery,
        Request $request,
    ): JsonResponse {
        Schema::create('db_dumps_copy', function (Blueprint $table) {
            $table->temporary();
            DMH::charUuid($table, 'id');
            $table->dateTime('created_at')->index();
            $table->dateTime('updated_at');
            DMH::charUuid($table, 'created_by');
            DMH::charUuid($table, 'updated_by');
            DMH::ascii($table, 'status');
            $table->string('name')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('app_version');
            $table->dateTime('restored_rc_at')->nullable();
            $table->dateTime('restored_prod_at')->nullable();
            $table->boolean('is_from_rc');
            $table->boolean('is_backuped');
        });

        DB::table('db_dumps_copy')->insert(
            array_map(
                fn(stdClass $row): array => (array)$row,
                DB::connection('db_dumps')
                    ->table('db_dumps')
                    ->orderByDesc('created_at')
                    ->limit(1000)
                    ->get()->all(),
            ),
        );

        return new JsonResponse($tquery->query($request));
    }
}
