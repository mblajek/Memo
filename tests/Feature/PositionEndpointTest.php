<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Facility;
use App\Models\Position;
use App\Models\User;
use App\Models\Value;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Helpers\AdminEndpointHelpers;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * Covers the developer/admin position endpoints. The default_order block invariants are
 * covered extensively in DefaultOrderManagerTest; this file keeps only a smoke-level
 * ordering check.
 */
class PositionEndpointTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;
    use AdminEndpointHelpers;

    private const string GLOBAL_URL = '/api/v1/admin/position';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private function makeDictionary(bool $extendable = true): Dictionary
    {
        return Dictionary::factory()->create(['is_extendable' => $extendable, 'is_fixed' => false]);
    }

    private function createPosition(string $dictionaryId, ?int $order = null, array $extra = []): string
    {
        $this->prepareAdminUser();
        $data = [
            'facilityId' => null,
            'dictionaryId' => $dictionaryId,
            'name' => 'pos-' . Str::random(8),
            'isFixed' => false,
            'isDisabled' => false,
        ] + ($order === null ? [] : ['defaultOrder' => $order]) + $extra;
        $result = $this->post(self::GLOBAL_URL, $data);
        $result->assertCreated();
        return $result->json('data.id');
    }

    /** @return list<int> the non-system orders of the dictionary, sorted ascending */
    private function orders(string $dictionaryId): array
    {
        return Position::query()
            ->where('dictionary_id', $dictionaryId)
            ->where('default_order', '<', DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET)
            ->orderBy('default_order')
            ->pluck('default_order')
            ->map(fn($o) => (int) $o)
            ->all();
    }

    private function order(string $positionId): int
    {
        return (int) Position::query()->findOrFail($positionId)->default_order;
    }

    public function testDefaultOrderIsAssignedAndPatchable(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id);
        $b = $this->createPosition($dictionary->id);
        self::assertSame(1, $this->order($a));
        self::assertSame(2, $this->order($b));

        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$a", ['defaultOrder' => 2])->assertOk();
        self::assertSame(2, $this->order($a));
        self::assertSame(1, $this->order($b));
    }

    public function testCannotAddPositionToNonExtendableDictionary(): void
    {
        $dictionary = $this->makeDictionary(extendable: false);
        $this->prepareAdminUser();
        $result = $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'dictionaryId' => $dictionary->id,
            'name' => 'pos',
            'isFixed' => false,
            'isDisabled' => false,
        ]);
        $result->assertBadRequest();
        self::assertContains('validation.not_extendable', $this->fieldCodes($result, 'dictionaryId'));
    }

    public function testFixedPositionCannotBeEditedOrDeleted(): void
    {
        $dictionary = $this->makeDictionary();
        $position = Position::factory()->fixed()->create([
            'dictionary_id' => $dictionary->id,
            'default_order' => 1,
        ]);

        $this->prepareAdminUser();
        $patch = $this->patch(self::GLOBAL_URL . "/{$position->id}", ['name' => 'changed']);
        $patch->assertBadRequest();
        self::assertContains('validation.not_editable', $this->fieldCodes($patch, 'id'));

        $delete = $this->delete(self::GLOBAL_URL . "/{$position->id}");
        $delete->assertBadRequest();
        self::assertContains('validation.not_editable', $this->fieldCodes($delete, 'id'));
        self::assertNotNull(Position::query()->find($position->id));
    }

    public function testReferencedPositionCannotBeDeleted(): void
    {
        $dictionary = $this->makeDictionary();
        $positionId = $this->createPosition($dictionary->id);
        $attribute = Attribute::factory()->create();
        Value::query()->create([
            'attribute_id' => $attribute->id,
            'object_id' => Str::uuid()->toString(),
            'ref_dict_id' => $positionId,
            'default_order' => 0,
            'created_by' => User::SYSTEM,
        ]);

        $this->prepareAdminUser();
        $result = $this->delete(self::GLOBAL_URL . "/$positionId");
        $result->assertBadRequest();
        self::assertContains('validation.in_use', $this->fieldCodes($result, 'id'));
        self::assertNotNull(Position::query()->find($positionId));
    }

    public function testCreateRejectsMissingName(): void
    {
        $dictionary = $this->makeDictionary();
        $this->prepareAdminUser();
        $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'dictionaryId' => $dictionary->id,
            'isFixed' => false,
            'isDisabled' => false,
        ])->assertBadRequest();
    }

    public function testFacilityScopedCreateForcesFacilityAndNonFixed(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = $this->makeDictionary();
        $this->prepareFacilityAdmin($facility);
        $result = $this->post("/api/v1/facility/{$facility->id}/admin/position", [
            'dictionaryId' => $dictionary->id,
            'name' => 'facility pos',
            'isDisabled' => false,
        ]);
        $result->assertCreated();
        $position = Position::query()->findOrFail($result->json('data.id'));
        self::assertSame($facility->id, $position->facility_id);
        self::assertFalse($position->is_fixed);
    }

    public function testFacilityPositionCannotUseOtherFacilitysDictionary(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::factory()->create(['facility_id' => Facility::factory()->create()->id]);
        $this->prepareFacilityAdmin($facility);
        $result = $this->post("/api/v1/facility/{$facility->id}/admin/position", [
            'dictionaryId' => $dictionary->id,
            'name' => 'pos',
            'isDisabled' => false,
        ]);
        $result->assertBadRequest();
        self::assertContains('validation.different_facility', $this->fieldCodes($result, 'dictionaryId'));
    }

    public function testAdminCreateRejectsFacilityMismatchWithDictionary(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::factory()->create(['facility_id' => Facility::factory()->create()->id]);
        $this->prepareAdminUser();
        $result = $this->post(self::GLOBAL_URL, [
            'facilityId' => $facility->id,
            'dictionaryId' => $dictionary->id,
            'name' => 'pos',
            'isFixed' => false,
            'isDisabled' => false,
        ]);
        $result->assertBadRequest();
        self::assertContains('validation.different_facility', $this->fieldCodes($result, 'dictionaryId'));
    }

    public function testFacilityCannotTouchGlobalOrOtherFacilitysPosition(): void
    {
        $facility = Facility::factory()->create();
        $global = Position::factory()->create();
        $foreign = Position::factory()->create(['facility_id' => Facility::factory()->create()->id]);
        $this->prepareFacilityAdmin($facility);
        $base = "/api/v1/facility/{$facility->id}/admin/position";
        foreach ([$global, $foreign] as $position) {
            $this->patch("$base/{$position->id}", ['name' => 'x'])->assertNotFound();
            $this->delete("$base/{$position->id}")->assertNotFound();
            self::assertNotNull(Position::query()->find($position->id));
        }
    }

    public function testDeleteReferencedByForeignKeyIsRejected(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $this->createPosition($dictionary->id); // 2
        DB::table('notifications')->insert([
            'id' => Str::uuid()->toString(),
            'created_at' => now(),
            'updated_at' => now(),
            'created_by' => User::SYSTEM,
            'updated_by' => User::SYSTEM,
            'notification_method_dict_id' => $a,
            'subject' => 'test',
            'scheduled_at' => now(),
            'status' => 'scheduled',
        ]);

        $this->prepareAdminUser();
        $result = $this->delete(self::GLOBAL_URL . "/$a");
        $result->assertBadRequest();
        self::assertContains('validation.in_use', $this->fieldCodes($result, 'id'));
        self::assertNotNull(Position::query()->find($a));
        self::assertSame([1, 2], $this->orders($dictionary->id));
    }

    public function testDeleteRemovesOwnAttributeValues(): void
    {
        $attribute = Attribute::factory()->create([
            'table' => 'positions',
            'api_name' => 'delattr' . fake()->unique()->numberBetween(1, 999_999),
        ]);
        $dictionary = $this->makeDictionary();
        $positionId = $this->createPosition($dictionary->id, extra: [$attribute->api_name => 'v']);
        self::assertSame(1, Value::query()->where('object_id', $positionId)->count());

        $this->prepareAdminUser();
        $this->delete(self::GLOBAL_URL . "/$positionId")->assertOk();
        self::assertSame(0, Value::query()->where('object_id', $positionId)->count());

        // with its value rows gone, the attribute is no longer reported as in use
        $this->delete('/api/v1/admin/attribute/' . $attribute->id)->assertOk();
    }

    public function testDictionaryIdIsImmutableOnPatch(): void
    {
        $dictionary = $this->makeDictionary();
        $other = $this->makeDictionary();
        $positionId = $this->createPosition($dictionary->id);
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$positionId", ['dictionaryId' => $other->id])->assertBadRequest();
        self::assertSame($dictionary->id, Position::query()->findOrFail($positionId)->dictionary_id);
    }

    public function testAttributeValuesAreSavedViaGlobalEndpoint(): void
    {
        $attribute = Attribute::factory()->create([
            'table' => 'positions',
            'api_name' => 'testposattr' . fake()->unique()->numberBetween(1, 999_999),
        ]);
        $dictionary = $this->makeDictionary();
        $positionId = $this->createPosition($dictionary->id, extra: [$attribute->api_name => 'hello']);
        $value = Value::query()
            ->where('attribute_id', $attribute->id)
            ->where('object_id', $positionId)
            ->firstOrFail();
        self::assertSame('hello', $value->string_value);
    }

    /** Creates a position attribute and marks it required by the dictionary. */
    private function requirePositionAttribute(Dictionary $dictionary): Attribute
    {
        $attribute = Attribute::factory()->create([
            'table' => 'positions',
            'api_name' => 'reqattr' . fake()->unique()->numberBetween(1, 999_999),
        ]);
        $this->prepareAdminUser();
        $this->patch('/api/v1/admin/dictionary/' . $dictionary->id, [
            'positionRequiredAttributeIds' => [$attribute->id],
        ])->assertOk();
        return $attribute;
    }

    public function testCreateRequiresDictionaryRequiredAttributes(): void
    {
        $dictionary = $this->makeDictionary();
        $attribute = $this->requirePositionAttribute($dictionary);

        $this->prepareAdminUser();
        $result = $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'dictionaryId' => $dictionary->id,
            'name' => 'pos',
            'isFixed' => false,
            'isDisabled' => false,
        ]);
        $result->assertBadRequest();
        self::assertContains('validation.required', $this->fieldCodes($result, $attribute->api_name));

        $this->createPosition($dictionary->id, extra: [$attribute->api_name => 'val']);
    }

    public function testUpdateCannotClearDictionaryRequiredAttribute(): void
    {
        $dictionary = $this->makeDictionary();
        $attribute = $this->requirePositionAttribute($dictionary);
        $positionId = $this->createPosition($dictionary->id, extra: [$attribute->api_name => 'val']);

        $this->prepareAdminUser();
        $result = $this->patch(self::GLOBAL_URL . "/$positionId", [$attribute->api_name => null]);
        $result->assertBadRequest();
        self::assertContains('validation.required', $this->fieldCodes($result, $attribute->api_name));

        $this->patch(self::GLOBAL_URL . "/$positionId", ['name' => 'renamed'])->assertOk();
    }

    public function testIsFixedCannotBeSetViaApi(): void
    {
        $dictionary = $this->makeDictionary();
        $this->prepareAdminUser();
        $result = $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'dictionaryId' => $dictionary->id,
            'name' => 'pos',
            'isFixed' => true,
            'isDisabled' => false,
        ]);
        $result->assertBadRequest();
        self::assertContains('validation.declined', $this->fieldCodes($result, 'isFixed'));
    }

    public function testPatchAcceptsUnchangedIsFixedButRejectsTrue(): void
    {
        $dictionary = $this->makeDictionary();
        $position = Position::factory()->create([
            'dictionary_id' => $dictionary->id,
            'default_order' => 1,
        ]);
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/{$position->id}", ['isFixed' => false])->assertOk();
        $result = $this->patch(self::GLOBAL_URL . "/{$position->id}", ['isFixed' => true]);
        $result->assertBadRequest();
        self::assertContains('validation.declined', $this->fieldCodes($result, 'isFixed'));
    }

    public function testCreateRejectsUnknownDictionary(): void
    {
        $this->prepareAdminUser();
        $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'dictionaryId' => Str::uuid()->toString(),
            'name' => 'x',
            'isFixed' => false,
            'isDisabled' => false,
        ])->assertBadRequest();
    }

    public function testCreateRejectsNonPositiveDefaultOrder(): void
    {
        $dictionary = $this->makeDictionary();
        $this->prepareAdminUser();
        $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'dictionaryId' => $dictionary->id,
            'name' => 'x',
            'isFixed' => false,
            'isDisabled' => false,
            'defaultOrder' => 0,
        ])->assertBadRequest();
    }

    public function testUnauthenticatedIsRejected(): void
    {
        $dictionary = $this->makeDictionary();
        PermissionMiddleware::setPermissions(null);
        $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'dictionaryId' => $dictionary->id,
            'name' => 'x',
            'isFixed' => false,
            'isDisabled' => false,
        ])->assertUnauthorized();
    }

    public function testVerifiedNonAdminIsForbidden(): void
    {
        $dictionary = $this->makeDictionary();
        $this->actAsVerifiedNonAdmin();
        $this->post(self::GLOBAL_URL, [
            'facilityId' => null,
            'dictionaryId' => $dictionary->id,
            'name' => 'x',
            'isFixed' => false,
            'isDisabled' => false,
        ])->assertForbidden();
    }
}
