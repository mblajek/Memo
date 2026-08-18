<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Facility;
use App\Models\User;
use App\Models\Value;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\AdminEndpointHelpers;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * Covers the developer/admin attribute endpoints: validation (dictionary/type coupling, unique
 * snake-cased api_name) and the edit/delete guards. The default_order block invariants are
 * covered extensively in DefaultOrderManagerTest; the smoke-level ordering check here asserts
 * relative to the table's current max order, because the attributes table is shared with
 * seeded data.
 */
class AttributeEndpointTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;
    use AdminEndpointHelpers;

    // positions: value-capable, and saving its values triggers no cross-model lookups
    // (unlike clients, where integration events load the client behind each value)
    private const string GLOBAL_URL = '/api/v1/admin/attribute';
    private const string TABLE = 'positions';
    private const string MODEL = 'position';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private static int $apiNameSeq = 0;

    private function createAttribute(array $overrides = []): TestResponse
    {
        $this->prepareAdminUser();
        $seq = ++self::$apiNameSeq;
        $data = [
            'facilityId' => null,
            'model' => self::MODEL,
            'name' => "attr $seq",
            'apiName' => "attr{$seq}x",
            'type' => 'string',
            'dictionaryId' => null,
            'isMultiValue' => false,
            'isFixed' => false,
            'requirementLevel' => 'optional',
            'description' => null,
        ];
        return $this->post(self::GLOBAL_URL, array_merge($data, $overrides));
    }

    private function maxOrder(string $table = self::TABLE): int
    {
        return (int) (Attribute::query()
            ->where('table', $table)
            ->where('default_order', '<', DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET)
            ->max('default_order') ?? 0);
    }

    private function order(string $attributeId): int
    {
        return (int) Attribute::query()->findOrFail($attributeId)->default_order;
    }

    public function testDefaultOrderIsAssignedAndPatchable(): void
    {
        $base = $this->maxOrder();
        $a = $this->createAttribute(['apiName' => 'orderone'])->assertCreated()->json('data.id');
        $b = $this->createAttribute(['apiName' => 'ordertwo'])->assertCreated()->json('data.id');
        self::assertSame($base + 1, $this->order($a));
        self::assertSame($base + 2, $this->order($b));

        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$a", ['defaultOrder' => $base + 2])->assertOk();
        self::assertSame($base + 2, $this->order($a));
        self::assertSame($base + 1, $this->order($b));
    }

    public function testApiNameIsSnakeCased(): void
    {
        $id = $this->createAttribute(['apiName' => 'myTestField'])->assertCreated()->json('data.id');
        self::assertSame('my_test_field', Attribute::query()->findOrFail($id)->api_name);
    }

    public function testApiNameMustBeUniquePerTable(): void
    {
        $this->createAttribute(['apiName' => 'sharedName'])->assertCreated();
        $result = $this->createAttribute(['apiName' => 'sharedName']);
        $result->assertBadRequest();
        self::assertContains('validation.unique', $this->fieldCodes($result, 'apiName'));
    }

    public function testDictTypeRequiresDictionary(): void
    {
        $result = $this->createAttribute(['type' => 'dict', 'dictionaryId' => null]);
        $result->assertBadRequest();
        self::assertContains('validation.required_for_dict_type', $this->fieldCodes($result, 'dictionaryId'));
    }

    public function testNonDictTypeRejectsDictionary(): void
    {
        $dictionary = Dictionary::factory()->create();
        $result = $this->createAttribute(['type' => 'string', 'dictionaryId' => $dictionary->id]);
        $result->assertBadRequest();
        self::assertContains('validation.required_for_dict_type', $this->fieldCodes($result, 'dictionaryId'));
    }

    public function testDictTypeWithDictionarySucceeds(): void
    {
        $dictionary = Dictionary::factory()->create();
        $id = $this->createAttribute(['type' => 'dict', 'dictionaryId' => $dictionary->id])
            ->assertCreated()->json('data.id');
        self::assertSame($dictionary->id, Attribute::query()->findOrFail($id)->dictionary_id);
    }

    public function testPatchUpdatesFields(): void
    {
        $id = $this->createAttribute()->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", [
            'name' => 'Renamed',
            'description' => 'A description',
            'requirementLevel' => 'recommended',
        ])->assertOk();
        $attribute = Attribute::query()->findOrFail($id);
        self::assertSame('Renamed', $attribute->name);
        self::assertSame('A description', $attribute->description);
        self::assertSame('recommended', $attribute->requirement_level->value);
    }

    public function testCannotEscalateRequirementLevelToRequired(): void
    {
        $id = $this->createAttribute(['requirementLevel' => 'optional'])->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $result = $this->patch(self::GLOBAL_URL . "/$id", ['requirementLevel' => 'required']);
        $result->assertBadRequest();
        self::assertContains('validation.only_on_create', $this->fieldCodes($result, 'requirementLevel'));
        self::assertSame('optional', Attribute::query()->findOrFail($id)->requirement_level->value);
    }

    public function testOtherRequirementLevelChangesAreAllowed(): void
    {
        $id = $this->createAttribute(['requirementLevel' => 'required'])->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        // re-sending the current level is a no-op, not an escalation
        $this->patch(self::GLOBAL_URL . "/$id", ['requirementLevel' => 'required'])->assertOk();
        $this->patch(self::GLOBAL_URL . "/$id", ['requirementLevel' => 'optional'])->assertOk();
        $this->patch(self::GLOBAL_URL . "/$id", ['requirementLevel' => 'recommended'])->assertOk();
        self::assertSame('recommended', Attribute::query()->findOrFail($id)->requirement_level->value);
    }

    public function testFixedAttributeCannotBeEditedOrDeleted(): void
    {
        $attribute = Attribute::factory()->fixed()->create([
            'table' => self::TABLE,
            'default_order' => $this->maxOrder() + 1,
        ]);
        $this->prepareAdminUser();
        $patch = $this->patch(self::GLOBAL_URL . "/{$attribute->id}", ['name' => 'changed']);
        $patch->assertBadRequest();
        self::assertContains('validation.not_editable', $this->fieldCodes($patch, 'id'));

        $delete = $this->delete(self::GLOBAL_URL . "/{$attribute->id}");
        $delete->assertBadRequest();
        self::assertContains('validation.not_editable', $this->fieldCodes($delete, 'id'));
        self::assertNotNull(Attribute::query()->find($attribute->id));
    }

    private function addValue(string $attributeId, string $objectId, int $order = 0): void
    {
        Value::query()->create([
            'attribute_id' => $attributeId,
            'object_id' => $objectId,
            'string_value' => 'x',
            'default_order' => $order,
            'created_by' => User::SYSTEM,
        ]);
    }

    public function testReferencedAttributeCannotBeDeleted(): void
    {
        $attribute = Attribute::factory()->create([
            'table' => self::TABLE,
            'default_order' => $this->maxOrder() + 1,
        ]);
        $this->addValue($attribute->id, Str::uuid()->toString());
        $this->prepareAdminUser();
        $result = $this->delete(self::GLOBAL_URL . "/{$attribute->id}");
        $result->assertBadRequest();
        self::assertContains('validation.in_use', $this->fieldCodes($result, 'id'));
        self::assertNotNull(Attribute::query()->find($attribute->id));
    }

    private function facilityAttributePayload(array $overrides = []): array
    {
        return array_merge([
            'model' => self::MODEL,
            'name' => 'facility attr',
            'apiName' => 'facilityAttr' . Str::random(5),
            'type' => 'string',
            'dictionaryId' => null,
            'isMultiValue' => false,
            'requirementLevel' => 'optional',
            'description' => null,
        ], $overrides);
    }

    public function testFacilityScopedCreateForcesFacilityAndNonFixed(): void
    {
        $facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($facility);
        $result = $this->post("/api/v1/facility/{$facility->id}/admin/attribute", $this->facilityAttributePayload());
        $result->assertCreated();
        $attribute = Attribute::query()->findOrFail($result->json('data.id'));
        self::assertSame($facility->id, $attribute->facility_id);
        self::assertFalse($attribute->is_fixed);
    }

    public function testFacilityAttributeCannotUseOtherFacilitysDictionary(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::factory()->create(['facility_id' => Facility::factory()->create()->id]);
        $this->prepareFacilityAdmin($facility);
        $result = $this->post(
            "/api/v1/facility/{$facility->id}/admin/attribute",
            $this->facilityAttributePayload(['type' => 'dict', 'dictionaryId' => $dictionary->id]),
        );
        $result->assertBadRequest();
        self::assertContains('validation.different_facility', $this->fieldCodes($result, 'dictionaryId'));
    }

    public function testFacilityAttributeMayUseGlobalDictionary(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::factory()->create();
        $this->prepareFacilityAdmin($facility);
        $this->post(
            "/api/v1/facility/{$facility->id}/admin/attribute",
            $this->facilityAttributePayload(['type' => 'dict', 'dictionaryId' => $dictionary->id]),
        )->assertCreated();
    }

    public function testFacilityCannotTouchGlobalOrOtherFacilitysAttribute(): void
    {
        $facility = Facility::factory()->create();
        $global = Attribute::factory()->create();
        $foreign = Attribute::factory()->create(['facility_id' => Facility::factory()->create()->id]);
        $this->prepareFacilityAdmin($facility);
        $base = "/api/v1/facility/{$facility->id}/admin/attribute";
        foreach ([$global, $foreign] as $attribute) {
            $this->patch("$base/{$attribute->id}", ['name' => 'x'])->assertNotFound();
            $this->delete("$base/{$attribute->id}")->assertNotFound();
            self::assertNotNull(Attribute::query()->find($attribute->id));
        }
    }

    public function testAdminCreateRejectsFacilityMismatchWithDictionary(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::factory()->create(['facility_id' => Facility::factory()->create()->id]);
        $result = $this->createAttribute(
            ['facilityId' => $facility->id, 'type' => 'dict', 'dictionaryId' => $dictionary->id],
        );
        $result->assertBadRequest();
        self::assertContains('validation.different_facility', $this->fieldCodes($result, 'dictionaryId'));
    }

    public function testAdminCreateAcceptsSameFacilityDictionary(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::factory()->create(['facility_id' => $facility->id]);
        $this->createAttribute(['facilityId' => $facility->id, 'type' => 'dict', 'dictionaryId' => $dictionary->id])
            ->assertCreated();
    }

    public function testDictionaryIdIsImmutableOnPatch(): void
    {
        $dictionary = Dictionary::factory()->create();
        $id = $this->createAttribute(['type' => 'dict', 'dictionaryId' => $dictionary->id])
            ->assertCreated()->json('data.id');
        $other = Dictionary::factory()->create();
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['dictionaryId' => $other->id])->assertBadRequest();
        self::assertSame($dictionary->id, Attribute::query()->findOrFail($id)->dictionary_id);
    }

    public function testIsMultiValueIsImmutableOnPatch(): void
    {
        $id = $this->createAttribute(['isMultiValue' => true])->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['isMultiValue' => false])->assertBadRequest();
        self::assertTrue(Attribute::query()->findOrFail($id)->is_multi_value);
    }

    public function testAttributeRequiredByDictionaryCannotBeDeleted(): void
    {
        $attribute = Attribute::factory()->create(['table' => 'positions']);
        $dictionary = Dictionary::factory()->create();
        $this->prepareAdminUser();
        $this->patch(
            '/api/v1/admin/dictionary/' . $dictionary->id,
            ['positionRequiredAttributeIds' => [$attribute->id]],
        )->assertOk();

        $result = $this->delete(self::GLOBAL_URL . "/{$attribute->id}");
        $result->assertBadRequest();
        self::assertContains('validation.in_use', $this->fieldCodes($result, 'id'));
        self::assertNotNull(Attribute::query()->find($attribute->id));
    }

    public function testCreateRejectsNullIsMultiValue(): void
    {
        $this->createAttribute(['isMultiValue' => null])->assertBadRequest();
    }

    public function testCreateRejectsUnknownDictionary(): void
    {
        $this->createAttribute(['type' => 'dict', 'dictionaryId' => Str::uuid()->toString()])->assertBadRequest();
    }

    public function testIsFixedCannotBeSetViaApi(): void
    {
        $result = $this->createAttribute(['isFixed' => true]);
        $result->assertBadRequest();
        self::assertContains('validation.declined', $this->fieldCodes($result, 'isFixed'));
    }

    public function testSeparatorRequiresEmptyRequirementLevel(): void
    {
        $result = $this->createAttribute(['type' => 'separator', 'requirementLevel' => 'optional']);
        $result->assertBadRequest();
        self::assertContains('validation.in', $this->fieldCodes($result, 'requirementLevel'));

        $id = $this->createAttribute(['type' => 'separator', 'requirementLevel' => 'empty'])
            ->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['requirementLevel' => 'empty'])->assertOk();
        $result = $this->patch(self::GLOBAL_URL . "/$id", ['requirementLevel' => 'recommended']);
        $result->assertBadRequest();
        self::assertContains('validation.in', $this->fieldCodes($result, 'requirementLevel'));
    }

    public function testPatchAcceptsUnchangedIsFixedButRejectsTrue(): void
    {
        $id = $this->createAttribute()->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['isFixed' => false])->assertOk();
        $result = $this->patch(self::GLOBAL_URL . "/$id", ['isFixed' => true]);
        $result->assertBadRequest();
        self::assertContains('validation.declined', $this->fieldCodes($result, 'isFixed'));
    }

    public function testCreateRejectsNonValueCapableModel(): void
    {
        $this->createAttribute(['model' => 'user'])->assertBadRequest();
    }

    public function testPatchWithUnchangedApiNameSucceeds(): void
    {
        $id = $this->createAttribute(['apiName' => 'keepname'])->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['apiName' => 'keepname'])->assertOk();
    }

    public function testPatchRenamesApiName(): void
    {
        $id = $this->createAttribute(['apiName' => 'oldName'])->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['apiName' => 'newName'])->assertOk();
        self::assertSame('new_name', Attribute::query()->findOrFail($id)->api_name);
    }

    public function testPatchRejectsDuplicateApiName(): void
    {
        $this->createAttribute(['apiName' => 'dupone'])->assertCreated();
        $id = $this->createAttribute(['apiName' => 'duptwo'])->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $result = $this->patch(self::GLOBAL_URL . "/$id", ['apiName' => 'dupone']);
        $result->assertBadRequest();
        self::assertContains('validation.unique', $this->fieldCodes($result, 'apiName'));
    }

    public function testPatchRejectsReservedApiName(): void
    {
        $id = $this->createAttribute()->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $result = $this->patch(self::GLOBAL_URL . "/$id", ['apiName' => 'id']);
        $result->assertBadRequest();
        self::assertContains('validation.reserved', $this->fieldCodes($result, 'apiName'));
    }

    public function testModelIsImmutableOnPatch(): void
    {
        $id = $this->createAttribute()->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['model' => 'client'])->assertBadRequest();
    }

    public function testTypeIsImmutableOnPatch(): void
    {
        $id = $this->createAttribute(['type' => 'string'])->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['type' => 'int'])->assertBadRequest();
        self::assertSame('string', Attribute::query()->findOrFail($id)->type->value);
    }

    public function testCreateRejectsColumnCollidingApiName(): void
    {
        $result = $this->createAttribute(['apiName' => 'id']);
        $result->assertBadRequest();
        self::assertContains('validation.reserved', $this->fieldCodes($result, 'apiName'));
    }

    public function testCreateDefaultsIsFixedToFalse(): void
    {
        $this->prepareAdminUser();
        $result = $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'model' => self::MODEL,
            'name' => 'no fixed flag',
            'apiName' => 'nofixed' . Str::random(5),
            'type' => 'string',
            'dictionaryId' => null,
            'isMultiValue' => false,
            'requirementLevel' => 'optional',
            'description' => null,
        ]);
        $result->assertCreated();
        self::assertFalse(Attribute::query()->findOrFail($result->json('data.id'))->is_fixed);
    }

    public function testCreateRejectsUnknownType(): void
    {
        $this->createAttribute(['type' => 'nosuchtype'])->assertBadRequest();
    }

    public function testCreateRejectsNonPositiveDefaultOrder(): void
    {
        $this->createAttribute(['defaultOrder' => 0])->assertBadRequest();
    }

    public function testUnauthenticatedIsRejected(): void
    {
        PermissionMiddleware::setPermissions(null);
        $this->post(self::GLOBAL_URL, [
            'model' => self::MODEL,
            'name' => 'x',
            'apiName' => 'x' . Str::random(5),
            'type' => 'string',
            'requirementLevel' => 'optional',
        ])->assertUnauthorized();
    }

    public function testVerifiedNonAdminIsForbidden(): void
    {
        $this->actAsVerifiedNonAdmin();
        $this->post(self::GLOBAL_URL, [
            'model' => self::MODEL,
            'name' => 'x',
            'apiName' => 'x' . Str::random(5),
            'type' => 'string',
            'requirementLevel' => 'optional',
        ])->assertForbidden();
    }
}
