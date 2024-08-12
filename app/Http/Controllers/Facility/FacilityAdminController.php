<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\Position;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// use OpenApi\Attributes as OA;

class FacilityAdminController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
        $this->permissionOneOf(Permission::developer);
    }

    // todo: extract into service, openApi
    public function postAttribute(): JsonResponse
    {
        $data = ['facility_id' => $this->getFacilityOrFail()->id]
            + $this->validate(Attribute::getInsertValidator([
                'model',
                'name',
                'api_name',
                'type',
                'dictionary_id',//todo: only "dict" type
                'default_order',
                'is_multi_value',
                //'is_fixed', // always false
                'requirement_level',
                'description',
            ]/*, false*/));


        if (($data['dictionary_id'] === null) === ($data['type'] === AttributeType::Dict->value)) {
            $exception = ExceptionFactory::validation();
            // todo: validation
            $exception->addValidation('dictionaryId', 'required_for_dict_type');
            throw $exception;
        }
        $data['is_fixed'] = false;
        $data['api_name'] = Str::snake($data['api_name']);
        $data['table'] = AttributeTable::{ucfirst($data['model'])}->value;

        $attribute = new Attribute();
        $attribute->fillOnly($data);

        if (
            Attribute::query()->where('table', $attribute->table)
                ->where('api_name', $attribute->api_name)->exists()
        ) {
            $exception = ExceptionFactory::validation();
            // todo: validation
            $exception->addValidation('apiName', 'not_unique');
            throw $exception;
        }

        DB::transaction(function () use ($attribute, $data) {
            $last = Attribute::query()->where('table', '=', $attribute->table->value)
                ->where('default_order', '<', DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET)
                ->aggregate('max', ['default_order']) ?? 0;  // numericAggregate() returns builder
            $attribute->default_order = min($attribute->default_order ?? ($last + 1), $last + 1);
            if ($attribute->default_order <= $last) {
                DB::statement(
                    "update `attributes` set `default_order` = 1 + `default_order`"
                    . " where `table` = ? and `default_order` between ? and ?"
                    . " order by default_order desc",
                    [$attribute->table->value, $attribute->default_order, $last],
                );
            }
            $attribute->save();
            // $attribute->attrSave($data);
        });
        return new JsonResponse(data: ['data' => ['id' => $attribute->id]], status: 201);
    }

    // todo: extract into service, openApi
    public function postDictionary(): JsonResponse
    {
        $data = ['facility_id' => $this->getFacilityOrFail()->id]
            + $this->validate(Dictionary::getInsertValidator([
                'name',
                //'is_fixed', // always false
                //'is_extendable', // always true
            ], true));
        $data['is_fixed'] = false;
        $data['is_extendable'] = true;
        $dictionary = new Dictionary();
        $dictionary->fillOnly($data);
        DB::transaction(function () use ($dictionary, $data) {
            $dictionary->attrSave($this->getFacilityOrFail(), $data);
        });
        return new JsonResponse(data: ['data' => ['id' => $dictionary->id]], status: 201);
    }

    // todo: extract into service, openApi
    public function postPosition(): mixed
    {
        $data = ['facility_id' => $this->getFacilityOrFail()->id]
            + $this->validate(Position::getInsertValidator([
                'dictionary_id',
                'name',
                //'is_fixed',//always false
                'is_disabled',
                'default_order',
            ], true));
        $data['is_fixed'] = false;
        $position = new Position();
        $position->fillOnly($data);
        //todo: validate for position_required_attributes
        if (!Dictionary::query()->findOrFail($position->dictionary_id)->is_extendable) {
            $exception = ExceptionFactory::validation();
            // todo: validation
            $exception->addValidation('dictionaryId', 'not_extendable');
            throw $exception;
        }

        DB::transaction(function () use ($position, $data) {
            $last = Position::query()->where('dictionary_id', '=', $position->dictionary_id)
                ->where('default_order', '<', DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET)
                ->aggregate('max', ['default_order']) ?? 0;  // numericAggregate() returns builder
            $position->default_order = min($position->default_order ?? ($last + 1), $last + 1);
            if ($position->default_order <= $last) {
                DB::statement(
                    "update `positions` set `default_order` = `default_order` + 1"
                    . " where `dictionary_id` = ? and `default_order` between ? and ?"
                    . " order by default_order desc",
                    [$position->dictionary_id, $position->default_order, $last],
                );
            }
            $position->attrSave($this->getFacilityOrFail(), $data);
        });
        return new JsonResponse(data: ['data' => ['id' => $position->id]], status: 201);
    }
}
