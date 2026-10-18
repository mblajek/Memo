<?php

namespace Tests\Feature;

use App\Models\Attribute;
use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\Facility;
use App\Models\GroupClient;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class GetFacilityClientListTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private Facility $facility;
    private Facility $otherFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        Attribute::clearCacheAll();
        $this->facility = Facility::factory()->create();
        $this->otherFacility = Facility::factory()->create();
    }

    private function makeClient(User $user, Facility $facility): void
    {
        $client = new Client();
        $client->user_id = $user->id;
        $client->facility_id = $facility->id;
        $client->short_code = '-';
        $client->type_dict_id = 'd1c57dfc-c118-49ff-ae38-6585645349ca'; // adult
        $client->saveOrFail();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $facility->id,
            'client_id' => $client->id,
        ]);
    }

    private function makeGroup(Facility $facility, User ...$users): string
    {
        $group = ClientGroup::query()->create(['facility_id' => $facility->id]);
        foreach ($users as $user) {
            GroupClient::query()->create(['client_group_id' => $group->id, 'user_id' => $user->id]);
        }
        return $group->id;
    }

    /** @return array<string, list<string>> Sorted, as the groups' creation times may be equal. */
    private function listGroupIds(Facility $facility, User ...$users): array
    {
        $this->prepareFacilityAdmin($facility);
        $result = $this->getJson(sprintf(
            '/api/v1/facility/%s/user/client/list?in=%s',
            $facility->id,
            implode(',', array_map(fn(User $user) => $user->id, $users)),
        ));
        $result->assertOk();
        $groupIds = [];
        foreach ($result->json('data') as $row) {
            $groupIds[$row['id']] = $row['client']['groupIds'];
            sort($groupIds[$row['id']]);
        }
        return $groupIds;
    }

    private static function sorted(string ...$ids): array
    {
        sort($ids);
        return $ids;
    }

    public function testGroupIdsOnlyFromTheFacility(): void
    {
        $client = User::factory()->create();
        $this->makeClient($client, $this->facility);
        // e.g. no longer a client there, but the group membership was left behind
        Member::factory()->create(['user_id' => $client->id, 'facility_id' => $this->otherFacility->id]);
        $otherClient = User::factory()->create();
        $this->makeClient($otherClient, $this->otherFacility);

        $group1 = $this->makeGroup($this->facility, $client);
        $otherGroup = $this->makeGroup($this->otherFacility, $client, $otherClient);
        $group2 = $this->makeGroup($this->facility, $client);

        $this->assertEquals(
            [$client->id => self::sorted($group1, $group2)],
            $this->listGroupIds($this->facility, $client),
        );
        $this->assertEquals(
            [$otherClient->id => [$otherGroup]],
            $this->listGroupIds($this->otherFacility, $otherClient),
        );
    }
}
