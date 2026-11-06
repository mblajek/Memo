<?php

namespace Tests\Feature;

use App\Models\Attribute;
use App\Models\ClientGroup;
use App\Models\Enums\AttendanceType;
use App\Models\Enums\NotificationMethod;
use App\Models\Facility;
use App\Models\GroupClient;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Member;
use App\Models\Notification;
use App\Models\User;
use App\Notification\NotificationStatus;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class DeleteFacilityClientTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    // Seeded fixed "adult" position of the client-type dictionary (the v0.21.0 schema migration).
    private const CLIENT_TYPE_ADULT = 'd1c57dfc-c118-49ff-ae38-6585645349ca';

    private Facility $facility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        Attribute::clearCacheAll();
        $this->facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($this->facility, user: User::factory()->create());
    }

    private function createClient(): string
    {
        $result = $this->post(sprintf('/api/v1/facility/%s/user/client', $this->facility->id), [
            'name' => 'Test Client',
            'client' => ['typeDictId' => self::CLIENT_TYPE_ADULT],
        ]);
        $result->assertCreated();
        return $result->json('data.id');
    }

    private function createAttendance(
        string $userId,
        ?Facility $facility = null,
        AttendanceType $type = AttendanceType::Client,
    ): MeetingAttendant {
        $meeting = new Meeting();
        $meeting->fill([
            'facility_id' => ($facility ?? $this->facility)->id,
            'date' => '2030-05-01',
            'start_dayminute' => 600,
            'duration_minutes' => 60,
            'status_dict_id' => Meeting::STATUS_PLANNED,
            'category_dict_id' => '137205e2-e9a1-4f8f-ada2-555319506b28', // 'other' category
            'type_dict_id' => '6e87acd5-70a0-4051-963b-42d439f44e42', // 'other' type
            'is_remote' => false,
        ]);
        $meeting->saveOrFail();
        $attendant = new MeetingAttendant();
        $attendant->fill([
            'meeting_id' => $meeting->id,
            'user_id' => $userId,
            'attendance_type_dict_id' => $type->value,
            'attendance_status_dict_id' => MeetingAttendant::ATTENDANCE_STATUS_OK,
            'default_order' => 1,
        ]);
        $attendant->saveOrFail();
        return $attendant;
    }

    private function createGroupMembership(string $userId, ?Facility $facility = null): GroupClient
    {
        $group = ClientGroup::query()->create(['facility_id' => ($facility ?? $this->facility)->id]);
        /** @var GroupClient */
        return GroupClient::query()->create(['client_group_id' => $group->id, 'user_id' => $userId]);
    }

    private function deleteClient(string $userId, array $data = []): array
    {
        $result = $this->deleteJson(
            sprintf('/api/v1/facility/%s/user/client/%s', $this->facility->id, $userId),
            $data,
        );
        $result->assertOk();
        return $result->json('data');
    }

    public function testDeletesUnusedUser(): void
    {
        $userId = $this->createClient();

        self::assertSame(
            ['clientDeleted' => true, 'memberDeleted' => true, 'userDeleted' => true],
            $this->deleteClient($userId),
        );
        self::assertFalse(DB::table('users')->where('id', $userId)->exists());
        self::assertFalse(DB::table('clients')->where('user_id', $userId)->exists());
        self::assertFalse(DB::table('members')->where('user_id', $userId)->exists());
    }

    public function testKeepsUserReferencedElsewhere(): void
    {
        $userId = $this->createClient();
        $now = CarbonImmutable::now();
        DB::table('log_entries')->insert([
            'id' => Str::uuid()->toString(),
            'created_at' => $now,
            'updated_at' => $now,
            'app_version' => 'test',
            'user_id' => $userId,
            'source' => 'test',
            'log_level' => 'info',
        ]);

        self::assertSame(
            ['clientDeleted' => true, 'memberDeleted' => true, 'userDeleted' => false],
            $this->deleteClient($userId),
        );
        self::assertTrue(DB::table('users')->where('id', $userId)->exists());
        self::assertFalse(DB::table('clients')->where('user_id', $userId)->exists());
    }

    public function testDeduplicationDeletesUserWhoseAttendancesWereMoved(): void
    {
        $userId = $this->createClient();
        $otherUserId = $this->createClient();
        $attendant = $this->createAttendance($userId);

        self::assertSame(
            ['clientDeleted' => true, 'memberDeleted' => true, 'userDeleted' => true],
            $this->deleteClient($userId, ['duplicateOf' => $otherUserId]),
        );
        self::assertFalse(DB::table('users')->where('id', $userId)->exists());
        self::assertSame($otherUserId, $attendant->refresh()->user_id);
    }

    public function testDeduplicationKeepsUserReferencedElsewhere(): void
    {
        $userId = $this->createClient();
        $otherUserId = $this->createClient();
        $attendant = $this->createAttendance($userId);
        $notification = new Notification();
        $notification->fill([
            'facility_id' => $this->facility->id,
            'user_id' => $userId,
            'notification_method_dict_id' => NotificationMethod::Sms,
            'subject' => 'Test',
            'scheduled_at' => '2030-05-01 09:00:00',
            'status' => NotificationStatus::sent,
        ]);
        $notification->saveOrFail();

        self::assertSame(
            ['clientDeleted' => true, 'memberDeleted' => true, 'userDeleted' => false],
            $this->deleteClient($userId, ['duplicateOf' => $otherUserId]),
        );
        self::assertTrue(DB::table('users')->where('id', $userId)->exists());
        self::assertSame($otherUserId, $attendant->refresh()->user_id);
    }

    public function testDeletesWithoutDuplicateWhenReferencedOnlyInOtherFacilities(): void
    {
        $userId = $this->createClient();
        $otherFacility = Facility::factory()->create();
        $attendant = $this->createAttendance($userId, $otherFacility);
        $groupClient = $this->createGroupMembership($userId, $otherFacility);

        self::assertSame(
            ['clientDeleted' => true, 'memberDeleted' => true, 'userDeleted' => false],
            $this->deleteClient($userId),
        );
        self::assertSame($userId, $attendant->refresh()->user_id);
        self::assertSame($userId, $groupClient->refresh()->user_id);
    }

    public function testDeletesWithoutDuplicateWhenOnlyStaffAttendances(): void
    {
        $userId = $this->createClient();
        $attendant = $this->createAttendance($userId, type: AttendanceType::Staff);

        $this->deleteClient($userId);

        self::assertSame($userId, $attendant->refresh()->user_id);
    }

    public function testDeduplicationMovesOnlyClientItemsOfTheFacility(): void
    {
        $userId = $this->createClient();
        $otherUserId = $this->createClient();
        $otherFacility = Facility::factory()->create();
        $attendant = $this->createAttendance($userId);
        $groupClient = $this->createGroupMembership($userId);
        $staffAttendant = $this->createAttendance($userId, type: AttendanceType::Staff);
        $otherAttendant = $this->createAttendance($userId, $otherFacility);
        $otherGroupClient = $this->createGroupMembership($userId, $otherFacility);

        self::assertSame(
            ['clientDeleted' => true, 'memberDeleted' => true, 'userDeleted' => false],
            $this->deleteClient($userId, ['duplicateOf' => $otherUserId]),
        );
        self::assertSame($otherUserId, $attendant->refresh()->user_id);
        self::assertSame($otherUserId, $groupClient->refresh()->user_id);
        self::assertSame($userId, $staffAttendant->refresh()->user_id);
        self::assertSame($userId, $otherAttendant->refresh()->user_id);
        self::assertSame($userId, $otherGroupClient->refresh()->user_id);
    }

    public function testDeduplicationDropsItemsTheDuplicateAlreadyHas(): void
    {
        $userId = $this->createClient();
        $otherUserId = $this->createClient();
        $attendant = $this->createAttendance($userId);
        $duplicateAttendant = new MeetingAttendant();
        $duplicateAttendant->fill([
            'meeting_id' => $attendant->meeting_id,
            'user_id' => $otherUserId,
            'attendance_type_dict_id' => AttendanceType::Client->value,
            'attendance_status_dict_id' => MeetingAttendant::ATTENDANCE_STATUS_OK,
            'default_order' => 2,
        ]);
        $duplicateAttendant->saveOrFail();

        $this->deleteClient($userId, ['duplicateOf' => $otherUserId]);

        self::assertNull(MeetingAttendant::query()->find($attendant->id));
        self::assertSame($otherUserId, $duplicateAttendant->refresh()->user_id);
    }

    public function testIsUsedInTablesSkipsOmittedColumns(): void
    {
        $user = User::factory()->create();
        Member::query()->create(['user_id' => $user->id, 'facility_id' => $this->facility->id]);

        self::assertTrue($user->isUsedInTables());
        self::assertFalse($user->isUsedInTables(omit: ['members.user_id']));
    }
}
