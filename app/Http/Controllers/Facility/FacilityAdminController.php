<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Http\Resources\PositionResource;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\Facility;
use App\Models\Position;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

class FacilityAdminController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
        $this->permissionOneOf(Permission::developer);
    }

    public function postAttribute(Facility $facility): JsonResponse
    {
        $data = ['facility_id' => $facility->id]
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
            ]/*, false*/));


        if (($data['dictionary_id'] === null) === ($data['type'] === AttributeType::Dict->value)) {
            $exception = ExceptionFactory::validation();
            // todo: validation
            $exception->addValidation('dictionary_id', 'required_for_dict_type');
            throw $exception;
        }
        $data['is_fixed'] = false;
        $data['api_name'] = Str::snake($data['api_name']);
        $data['table'] = AttributeTable::{ucfirst($data['model'])}->value;
        unset($data['model']);

        $attribute = new Attribute($data);

        DB::transaction(function () use ($attribute, $data) {
            if (
                Attribute::query()->where('table', $attribute->table)
                    ->where('default_order', $attribute->default_order)->exists()
            ) {
                $last = DB::select(
                    "select min(`a1`.`default_order`) as `last` from `attributes` `a1` left join `attributes` `a2`"
                    . " on `a1`.`table` = `a2`.`table` and `a1`.`default_order` = `a2`.`default_order` - 1"
                    . " where `a1`.`table` = ? and `a2`.`id` is null and `a1`.`default_order` >= ?",
                    [$attribute->table->value, $attribute->default_order],
                )[0]->last;
                DB::statement(
                    "update `attributes` set `default_order` = 1 + `default_order`"
                    . " where `table` = ?"
                    . " and `default_order` between ? and ?"
                    . " order by default_order desc",
                    [$attribute->table->value, $attribute->default_order, $last],
                );
            }
            $attribute->save();
            // $attribute->attrSave($data);
        });
        return new JsonResponse(data: ['data' => ['id' => $attribute->id]], status: 201);
    }

    public function postDictionary(Facility $facility): JsonResponse
    {
        $data = ['facility_id' => $facility->id] + $this->validate(Dictionary::getInsertValidator([
                'name',
                //'is_fixed', // always false
                //'is_extendable', // always true
            ], true));
        $data['is_fixed'] = false;
        $data['is_extendable'] = true;
        $dictionary = new Dictionary($data);
        DB::transaction(function () use ($dictionary, $data) {
            $dictionary->save();
            $dictionary->attrSave($data);
        });
        return new JsonResponse(data: ['data' => ['id' => $dictionary->id]], status: 201);
    }

    public function postPosition(Facility $facility): JsonResponse
    {
        $data = ['facility_id' => $facility->id]
            + $this->validate(Position::getInsertValidator([
                'dictionary_id',
                'name',
                //'is_fixed',//always false
                'is_disabled',
                'default_order',
            ], true));
        $data['is_fixed'] = false;
        $position = new Position($data);

        DB::transaction(function () use ($position, $data) {
            if (
                Position::query()->where('dictionary_id', $position->dictionary_id)
                    ->where('default_order', $position->default_order)->exists()
            ) {
                $last = DB::select(
                    "select min(`p1`.`default_order`) as `last` from `positions` `p1` left join `positions` `p2`"
                    . " on `p1`.`dictionary_id` = `p2`.`dictionary_id` and `p1`.`default_order` = `p2`.`default_order` - 1"
                    . " where `p1`.`dictionary_id` = ? and `p2`.`id` is null and `p1`.`default_order` >= ?",
                    [$position->dictionary_id, $position->default_order],
                )[0]->last;
                DB::statement(
                    "update `positions` set `default_order` = 1 + `default_order`"
                    . " where `dictionary_id` = ?"
                    . " and `default_order` between ? and ?"
                    . " order by default_order desc",
                    [$position->dictionary_id, $position->default_order, $last],
                );
            }
            $position->save();
            $position->attrSave($data);
        });
        return new JsonResponse(data: ['data' => ['id' => $position->id]], status: 201);
    }


}
