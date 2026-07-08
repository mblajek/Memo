<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\Attribute;
use App\Models\Dictionary;
use App\Models\Facility;
use App\Models\Member;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * Round-trip of the custom client-attribute system via the facility ClientController:
 * attribute values are stored and read back, dict attributes validate the position
 * against the facility, and short_code is auto-generated sequentially.
 *
 * Notes:
 *  - Custom attributes are cached in-process (HasCache) -> Attribute::clearCacheAll() before
 *    each request.
 *  - The attributes table has GLOBAL unique (table, api_name) and (table, default_order), so
 *    test attributes use a distinctive api_name and the next free default_order.
 *  - Creating a client requires the fixed `typeDictId` attribute, so every payload includes the
 *    seeded "adult" client-type position.
 *  - Fixtures are created under the admin context; the request runs as a facility admin (the
 *    endpoint requires facilityAdmin|facilityStaff).
 */
class FacilityClientAttributeTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    // Seeded fixed "adult" position of the client-type dictionary (common_client_attributes migration).
    private const CLIENT_TYPE_ADULT = 'd1c57dfc-c118-49ff-ae38-6585645349ca';

    private Facility $facility;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        Attribute::clearCacheAll();
        $this->facility = Facility::factory()->create();
        $this->admin = User::factory()->create();
    }

    private function makeClientAttribute(string $apiName, string $type, ?string $dictionaryId = null): void
    {
        $order = (Attribute::query()->where('table', 'clients')->max('default_order') ?? 0) + 1;
        Attribute::create([
            'facility_id' => $this->facility->id,
            'table' => 'clients',
            'name' => $apiName,
            'api_name' => $apiName,
            'type' => $type,
            'dictionary_id' => $dictionaryId,
            'default_order' => $order,
            // false => single value stored in the `values` table; null would map to a real
            // `clients` column (only fixed/built-in attributes have those).
            'is_multi_value' => false,
            'is_fixed' => false,
            'requirement_level' => 'optional',
        ]);
    }

    /** Creates a dict attribute backed by a one-position dictionary; returns the valid position id. */
    private function makeDictAttribute(string $apiName): string
    {
        $dictionary = Dictionary::create([
            'facility_id' => $this->facility->id,
            'name' => $apiName . 'Dict',
            'is_fixed' => false,
            'is_extendable' => true,
        ]);
        $position = Position::create([
            'dictionary_id' => $dictionary->id,
            'facility_id' => $this->facility->id,
            'name' => 'option',
            'is_fixed' => false,
            'is_disabled' => false,
            'default_order' => 1,
        ]);
        $this->makeClientAttribute($apiName, 'dict', $dictionary->id);
        return $position->id;
    }

    private function createClient(array $client): TestResponse
    {
        Attribute::clearCacheAll();
        $creator = new PermissionObjectCreator();
        $creator->user = $this->admin;
        $creator->facility = $this->facility;
        $creator->loggedIn = true;
        $creator->verified = true;
        $creator->facilityMember = true;
        $creator->facilityAdmin = true;
        PermissionMiddleware::setPermissions($creator->getPermissionObject());

        return $this->post(sprintf('/api/v1/facility/%s/user/client', $this->facility->id), [
            'name' => 'Test Client',
            'client' => $client + ['typeDictId' => self::CLIENT_TYPE_ADULT],
        ]);
    }

    private function storedAttrValues(string $userId): array
    {
        $member = Member::query()
            ->where('user_id', $userId)->where('facility_id', $this->facility->id)->firstOrFail();
        return $member->client->attrValues($this->facility);
    }

    public function testStoresStringAttributeValue(): void
    {
        // Single-word api_name so snake_case (DB / snake-cased request key) == camelCase.
        $this->makeClientAttribute('teststr', 'string');

        $result = $this->createClient(['teststr' => 'hello world']);
        $result->assertCreated();

        self::assertSame('hello world', $this->storedAttrValues($result->json('data.id'))['teststr'] ?? null);
    }

    public function testDictAttributeAcceptsValidPosition(): void
    {
        $positionId = $this->makeDictAttribute('testdict');

        $result = $this->createClient(['testdict' => $positionId]);
        $result->assertCreated();

        self::assertSame($positionId, $this->storedAttrValues($result->json('data.id'))['testdict'] ?? null);
    }

    public function testDictAttributeRejectsUnknownPosition(): void
    {
        $this->makeDictAttribute('testdict');

        // A valid-looking UUID that is not a position in the facility -> rejected by the rule.
        $result = $this->createClient(['testdict' => '3f2504e0-4f89-41d3-9a0c-0305e82c3301']);
        $result->assertBadRequest();
        self::assertContains('validation.custom.position_in_dictionary', array_column($result->json('errors'), 'code'));
    }

    public function testShortCodeIsAutoGeneratedSequentially(): void
    {
        $first = $this->createClient([]);
        $first->assertCreated();
        self::assertSame('1', $first->json('data.shortCode'));

        $second = $this->createClient([]);
        $second->assertCreated();
        self::assertSame('2', $second->json('data.shortCode'));
    }
}
