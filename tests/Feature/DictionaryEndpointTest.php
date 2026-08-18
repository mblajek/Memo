<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Facility;
use App\Models\Position;
use App\Models\User;
use App\Models\Value;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\AdminEndpointHelpers;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/** Covers the developer/admin dictionary endpoints, including the edit/delete guards. */
class DictionaryEndpointTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;
    use AdminEndpointHelpers;

    private const string GLOBAL_URL = '/api/v1/admin/dictionary';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private function createDictionary(array $overrides = []): TestResponse
    {
        $this->prepareAdminUser();
        $data = ['facilityId' => null, 'name' => 'dict ' . Str::random(6), 'isFixed' => false, 'isExtendable' => true];
        return $this->post(self::GLOBAL_URL, array_merge($data, $overrides));
    }

    public function testCreateSucceeds(): void
    {
        $id = $this->createDictionary()->assertCreated()->json('data.id');
        $dictionary = Dictionary::query()->findOrFail($id);
        self::assertNull($dictionary->facility_id);
        self::assertFalse($dictionary->is_fixed);
        self::assertTrue($dictionary->is_extendable);
    }

    public function testPatchUpdatesName(): void
    {
        $id = $this->createDictionary()->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['name' => 'Renamed'])->assertOk();
        self::assertSame('Renamed', Dictionary::query()->findOrFail($id)->name);
    }

    public function testDeleteEmptyDictionarySucceeds(): void
    {
        $id = $this->createDictionary()->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->delete(self::GLOBAL_URL . "/$id")->assertOk();
        self::assertNull(Dictionary::query()->find($id));
    }

    public function testCannotDeleteDictionaryWithPositions(): void
    {
        $dictionary = Dictionary::factory()->create();
        Position::factory()->create(['dictionary_id' => $dictionary->id, 'default_order' => 1]);
        $this->prepareAdminUser();
        $result = $this->delete(self::GLOBAL_URL . "/{$dictionary->id}");
        $result->assertBadRequest();
        self::assertContains('validation.in_use', $this->fieldCodes($result, 'id'));
        self::assertNotNull(Dictionary::query()->find($dictionary->id));
    }

    public function testCannotDeleteDictionaryReferencedByAttribute(): void
    {
        $dictionary = Dictionary::factory()->create();
        Attribute::factory()->create([
            'table' => 'grants',
            'type' => 'dict',
            'dictionary_id' => $dictionary->id,
            'default_order' => 900_000,
        ]);
        $this->prepareAdminUser();
        $result = $this->delete(self::GLOBAL_URL . "/{$dictionary->id}");
        $result->assertBadRequest();
        self::assertContains('validation.in_use', $this->fieldCodes($result, 'id'));
        self::assertNotNull(Dictionary::query()->find($dictionary->id));
    }

    public function testFixedDictionaryCannotBeEditedOrDeleted(): void
    {
        $dictionary = Dictionary::factory()->fixed()->create();
        $this->prepareAdminUser();
        $patch = $this->patch(self::GLOBAL_URL . "/{$dictionary->id}", ['name' => 'changed']);
        $patch->assertBadRequest();
        self::assertContains('validation.not_editable', $this->fieldCodes($patch, 'id'));

        $delete = $this->delete(self::GLOBAL_URL . "/{$dictionary->id}");
        $delete->assertBadRequest();
        self::assertContains('validation.not_editable', $this->fieldCodes($delete, 'id'));
        self::assertNotNull(Dictionary::query()->find($dictionary->id));
    }

    public function testFacilityScopedCreateForcesFacilityAndFlags(): void
    {
        $facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($facility);
        $result = $this->post("/api/v1/facility/{$facility->id}/admin/dictionary", ['name' => 'facility dict']);
        $result->assertCreated();
        $dictionary = Dictionary::query()->findOrFail($result->json('data.id'));
        self::assertSame($facility->id, $dictionary->facility_id);
        self::assertFalse($dictionary->is_fixed);
        self::assertTrue($dictionary->is_extendable);
    }

    public function testIsFixedCannotBeSetViaApi(): void
    {
        $result = $this->createDictionary(['isFixed' => true]);
        $result->assertBadRequest();
        self::assertContains('validation.declined', $this->fieldCodes($result, 'isFixed'));
    }

    public function testBarePlusNameIsRejected(): void
    {
        $result = $this->createDictionary(['name' => '+']);
        $result->assertBadRequest();
        self::assertContains('validation.not_in', $this->fieldCodes($result, 'name'));
    }

    public function testPatchAcceptsUnchangedIsFixedButRejectsTrue(): void
    {
        $id = $this->createDictionary()->assertCreated()->json('data.id');
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/$id", ['isFixed' => false])->assertOk();
        $result = $this->patch(self::GLOBAL_URL . "/$id", ['isFixed' => true]);
        $result->assertBadRequest();
        self::assertContains('validation.declined', $this->fieldCodes($result, 'isFixed'));
    }

    public function testCannotCreateDictionaryWithDuplicateName(): void
    {
        $existing = Dictionary::factory()->create();
        $result = $this->createDictionary(['name' => $existing->name]);
        $result->assertBadRequest();
        self::assertContains('validation.unique', $this->fieldCodes($result, 'name'));
    }

    public function testFacilityDictionaryCannotShadowGlobalName(): void
    {
        $global = Dictionary::factory()->create();
        $facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($facility);
        $result = $this->post("/api/v1/facility/{$facility->id}/admin/dictionary", ['name' => $global->name]);
        $result->assertBadRequest();
        self::assertContains('validation.unique', $this->fieldCodes($result, 'name'));
    }

    public function testSameNameAllowedInDifferentFacilities(): void
    {
        $name = 'shared name ' . Str::random(6);
        foreach ([Facility::factory()->create(), Facility::factory()->create()] as $facility) {
            $this->prepareFacilityAdmin($facility);
            $this->post("/api/v1/facility/{$facility->id}/admin/dictionary", ['name' => $name])
                ->assertCreated();
        }
    }

    public function testRenameCannotShadowExistingName(): void
    {
        $existing = Dictionary::factory()->create();
        $dictionary = Dictionary::factory()->create();
        $this->prepareAdminUser();
        $result = $this->patch(self::GLOBAL_URL . "/{$dictionary->id}", ['name' => $existing->name]);
        $result->assertBadRequest();
        self::assertContains('validation.unique', $this->fieldCodes($result, 'name'));
    }

    public function testRenameToOwnNameSucceeds(): void
    {
        $dictionary = Dictionary::factory()->create();
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/{$dictionary->id}", ['name' => $dictionary->name])->assertOk();
    }

    public function testCannotRequireSeparatorAttribute(): void
    {
        $dictionary = Dictionary::factory()->create();
        $attribute = Attribute::factory()->create([
            'table' => 'positions',
            'type' => 'separator',
            'api_name' => 'sepattr' . fake()->unique()->numberBetween(1, 999_999),
        ]);
        $this->prepareAdminUser();
        $result = $this->patch(
            self::GLOBAL_URL . "/{$dictionary->id}",
            ['positionRequiredAttributeIds' => [$attribute->id]],
        );
        $result->assertBadRequest();
        self::assertContains('validation.exists', $this->fieldCodes($result, 'positionRequiredAttributeIds'));
    }

    public function testCannotRequirePositionAttributesWhenPositionsLackValues(): void
    {
        $dictionary = Dictionary::factory()->create();
        Position::factory()->create(['dictionary_id' => $dictionary->id, 'default_order' => 1]);
        $attribute = Attribute::factory()->create([
            'table' => 'positions',
            'api_name' => 'reqattr' . fake()->unique()->numberBetween(1, 999_999),
        ]);
        $this->prepareAdminUser();
        $result = $this->patch(
            self::GLOBAL_URL . "/{$dictionary->id}",
            ['positionRequiredAttributeIds' => [$attribute->id]],
        );
        $result->assertBadRequest();
        self::assertContains(
            'validation.missing_on_positions',
            $this->fieldCodes($result, 'positionRequiredAttributeIds'),
        );
    }

    public function testCanRequirePositionAttributesWhenPositionsHaveValues(): void
    {
        $dictionary = Dictionary::factory()->create();
        $position = Position::factory()->create(['dictionary_id' => $dictionary->id, 'default_order' => 1]);
        $attribute = Attribute::factory()->create([
            'table' => 'positions',
            'api_name' => 'reqattr' . fake()->unique()->numberBetween(1, 999_999),
        ]);
        Value::query()->create([
            'attribute_id' => $attribute->id,
            'object_id' => $position->id,
            'string_value' => 'x',
            'default_order' => 0,
            'created_by' => User::SYSTEM,
        ]);
        $this->prepareAdminUser();
        $this->patch(
            self::GLOBAL_URL . "/{$dictionary->id}",
            ['positionRequiredAttributeIds' => [$attribute->id]],
        )->assertOk();
    }

    public function testCannotRequireOtherFacilitysAttribute(): void
    {
        $dictionary = Dictionary::factory()->create();
        $attribute = Attribute::factory()->create([
            'table' => 'positions',
            'facility_id' => Facility::factory()->create()->id,
        ]);
        $this->prepareAdminUser();
        $result = $this->patch(
            self::GLOBAL_URL . "/{$dictionary->id}",
            ['positionRequiredAttributeIds' => [$attribute->id]],
        );
        $result->assertBadRequest();
        self::assertContains(
            'validation.different_facility',
            $this->fieldCodes($result, 'positionRequiredAttributeIds'),
        );
    }

    public function testCanRequireSameFacilitysAttribute(): void
    {
        $facility = Facility::factory()->create();
        $dictionary = Dictionary::factory()->create(['facility_id' => $facility->id]);
        $attribute = Attribute::factory()->create([
            'table' => 'positions',
            'facility_id' => $facility->id,
        ]);
        $this->prepareAdminUser();
        $this->patch(
            self::GLOBAL_URL . "/{$dictionary->id}",
            ['positionRequiredAttributeIds' => [$attribute->id]],
        )->assertOk();
    }

    public function testCannotRequireNonPositionAttribute(): void
    {
        $dictionary = Dictionary::factory()->create();
        $attribute = Attribute::factory()->create(); // a grants-table attribute
        $this->prepareAdminUser();
        $result = $this->patch(
            self::GLOBAL_URL . "/{$dictionary->id}",
            ['positionRequiredAttributeIds' => [$attribute->id]],
        );
        $result->assertBadRequest();
        self::assertContains('validation.exists', $this->fieldCodes($result, 'positionRequiredAttributeIds'));
    }

    public function testAdminPatchCanToggleExtendable(): void
    {
        $dictionary = Dictionary::factory()->create(['is_extendable' => true]);
        $this->prepareAdminUser();
        $this->patch(self::GLOBAL_URL . "/{$dictionary->id}", ['isExtendable' => false])->assertOk();
        self::assertFalse($dictionary->refresh()->is_extendable);
    }

    public function testFacilityCannotTouchGlobalOrOtherFacilitysDictionary(): void
    {
        $facility = Facility::factory()->create();
        $global = Dictionary::factory()->create();
        $foreign = Dictionary::factory()->create(['facility_id' => Facility::factory()->create()->id]);
        $this->prepareFacilityAdmin($facility);
        $base = "/api/v1/facility/{$facility->id}/admin/dictionary";
        foreach ([$global, $foreign] as $dictionary) {
            $this->patch("$base/{$dictionary->id}", ['name' => 'x'])->assertNotFound();
            $this->delete("$base/{$dictionary->id}")->assertNotFound();
            self::assertNotNull(Dictionary::query()->find($dictionary->id));
        }
    }

    public function testUnauthenticatedIsRejected(): void
    {
        PermissionMiddleware::setPermissions(null);
        $this->post(self::GLOBAL_URL, ['facilityId' => null, 'name' => 'x', 'isFixed' => false, 'isExtendable' => true])
            ->assertUnauthorized();
    }

    public function testVerifiedNonAdminIsForbidden(): void
    {
        $this->actAsVerifiedNonAdmin();
        $this->post(self::GLOBAL_URL, ['facilityId' => null, 'name' => 'x', 'isFixed' => false, 'isExtendable' => true])
            ->assertForbidden();
    }
}
