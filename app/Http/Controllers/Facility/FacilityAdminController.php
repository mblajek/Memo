<?php

namespace App\Http\Controllers\Facility;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\Facility;
use App\Models\Member;
use App\Models\Position;
use App\Models\User;
use App\Rules\Valid;
use App\Services\Member\UpdateMemberService;
use App\Services\User\UpdateUserService;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper;
use App\Utils\OpenApi\FacilityParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

use OpenApi\Attributes as OA;

class FacilityAdminController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
        $this->permissionOneOf(Permission::facilityAdmin, Permission::developer)->only(['postAttribute', 'postDictionary', 'postPosition']);
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/user/admin/{user}',
        description: new PermissionDescribe(Permission::facilityAdmin),
        summary: 'Update facility admin',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Jan'),
                    new OA\Property(property: 'email', type: 'string', example: 'jan@jan.pl'),
                    new OA\Property(property: 'hasEmailVerified', type: 'bool', example: false),
                    new OA\Property(property: 'password', type: 'string', example: 'password'),
                    new OA\Property(property: 'passwordExpireAt', type: 'datetime', example: '2023-05-10T20:46:43Z'),
                    new OA\Property(property: 'member', type: 'object', example: ['hasFacilityAdmin' => false]),
                ]
            )
        ),
        tags: ['Facility admin'],
        parameters: [
            new FacilityParameter(),
            new OA\Parameter(
                name: 'user',
                description: 'User id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid', example: 'UUID'),
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Updated'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )] /** @throws ApiException */
    public function patch(
        /** @noinspection PhpUnusedParameterInspection */
        Facility $facility,
        User $user,
        UpdateUserService $userService,
        UpdateMemberService $memberService,
    ): JsonResponse {
        $member = $user->belongsToFacilityOrFail($facility, isFacilityAdmin: true);
        $isManagedByFacility = $user->managed_by_facility_id === $facility->id;

        $userKeys = ['name', 'email', 'has_email_verified', 'has_password', 'password', 'password_expire_at'];
        $rules = [];
        foreach (User::getPatchResourceValidator($user) as $field => $rule) {
            $rules[$field] = $isManagedByFacility && in_array($field, $userKeys) ? $rule : 'missing';
        }
        $rules['member'] = Valid::array(keys: ['has_facility_admin'], sometimes:true);
        $rules['member.has_facility_admin'] = Member::getPatchValidator(['has_facility_admin'], $member)['has_facility_admin'];
        $userData = $this->validate($rules);
        $hasFacilityAdmin = $userData['member']['has_facility_admin'] ?? null;
        unset($userData['member']);
        $userAttributes = $userService->getAttributesAfterPatch($user, $userData);
        Validator::validate($userAttributes, User::getResourceValidator());

        DB::transaction(function () use (
            $isManagedByFacility, $userService, $memberService, $user, $member, $userAttributes, $hasFacilityAdmin) {
            // temporary solution, use "select for update" on "facilities" as mutex for other tables
            // todo: use lock or any other standard way to generate unique short_code
            Facility::query()->lockForUpdate()->count();
            if ($isManagedByFacility) {
                $userService->update($user, $userAttributes);
            }
            if ($hasFacilityAdmin !== null) {
                $memberService->update($member, ['has_facility_admin' => $hasFacilityAdmin]);
            }
        });
        return new JsonResponse();
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
