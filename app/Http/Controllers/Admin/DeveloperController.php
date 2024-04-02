<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Models\Enums\AttributeTable;
use App\Rules\Valid;
use App\Utils\Date\DateHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DeveloperController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::developer);
    }

    public function migrate(string $hash = ''): Response
    {
        Artisan::call('migrate:status');
        $status = Artisan::output();
        $statusHash = md5($status);
        if ($hash === $statusHash) {
            Artisan::call('migrate', ['--step' => true]);
            $statusHash = Artisan::output();
        }
        return new Response($status . $statusHash, headers: ['Content-Type' => 'text/plain']);
    }

    public function overwriteMetadata(): JsonResponse
    {
        $data = $this->validate([
            'model' => Valid::trimmed(
                [Rule::in(array_map(fn(AttributeTable $table) => lcfirst($table->name), AttributeTable::cases()))]
            ),
            'id' => Valid::uuid(),
            'created_at' => Valid::datetime(sometimes: true),
            'updated_at' => Valid::datetime(sometimes: true),
            'created_by' => Valid::uuid([Rule::exists('users', 'id')], sometimes: true),
            'updated_by' => Valid::uuid([Rule::exists('users', 'id')], sometimes: true),
        ]);
        $updateData = array_intersect_key($data, array_flip(['created_by', 'updated_by']))
            + array_map(
                DateHelper::zuluToDbString(...),
                array_intersect_key($data, array_flip(['created_at', 'updated_at']))
            );
        $updated = DB::table(AttributeTable::{ucfirst($data['model'])}->value)
            ->where('id', $data['id'])->update($updateData);
        return new JsonResponse(data: ['data' => (bool)$updated], status: 200);
    }
}
