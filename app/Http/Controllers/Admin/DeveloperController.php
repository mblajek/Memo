<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Models\Enums\AttributeTable;
use App\Models\Member;
use App\Models\StaffMember;
use App\Rules\Valid;
use App\Utils\Date\DateHelper;
use App\Utils\Nullable;
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
            Artisan::call('migrate', array_fill_keys(['--step', '--force'], true));
            $statusHash = Artisan::output();
        }
        return new Response($status . $statusHash, headers: ['Content-Type' => 'text/plain']);
    }

    public function overwriteMetadata(): JsonResponse
    {
        $model = AttributeTable::{ucfirst(
            $this->validate([
                'model' => Valid::trimmed(
                    [Rule::in(array_map(fn(AttributeTable $table) => lcfirst($table->name), AttributeTable::cases()))]
                ),
            ])['model']
        )};
        $isClientOrStaff = $model === AttributeTable::Client || $model === AttributeTable::StaffMember;

        $data = $this->validate([
            'id' => Valid::uuid(),
            'facility_id' => Valid::uuid([Rule::exists('facilities', 'id')], sometimes: !$isClientOrStaff),
            'created_at' => Valid::datetime(sometimes: true),
            'updated_at' => Valid::datetime(sometimes: true),
            'created_by' => Valid::uuid([Rule::exists('users', 'id')], sometimes: true),
            'updated_by' => Valid::uuid([Rule::exists('users', 'id')], sometimes: true),
        ]);

        $id = (!$isClientOrStaff) ? $data['id'] : Member::query()->where('user_id', $data['id'])
            ->where('facility_id', $data['facility_id'])->firstOrFail()
            ->offsetGet(($model === AttributeTable::Client) ? 'client_id' : 'staff_member_id');

        $updateData = array_intersect_key($data, array_flip(['created_by', 'updated_by']))
            + array_map(
                DateHelper::zuluToDbString(...),
                array_intersect_key($data, array_flip(['created_at', 'updated_at']))
            );
        $updated = DB::table($model->value)->where('id', $id)->update($updateData);
        return new JsonResponse(data: ['data' => (bool)$updated], status: 200);
    }

    public function patchStaff(): JsonResponse
    {
        $data = $this->validate([
            'id' => Valid::uuid(),
            'facility_id' => Valid::uuid([Rule::exists('facilities', 'id')]),
            'deactivated_at' => Valid::datetime(nullable: true),
        ]);

        $id = Member::query()->where('user_id', $data['id'])
            ->where('facility_id', $data['facility_id'])->firstOrFail()
            ->offsetGet('staff_member_id');

        $updated = StaffMember::query()->where('id', $id)
            ->update(['deactivated_at' => Nullable::call($data['deactivated_at'], DateHelper::zuluToDbString(...))]);

        return new JsonResponse(data: ['data' => (bool)$updated], status: 200);
    }
}
