<?php

namespace Tests\Feature;

use App\Models\Attribute;
use App\Models\Enums\AttendanceType;
use App\Models\Enums\NotificationMethod;
use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use RuntimeException;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class ClientNotificationMethodTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    // Seeded fixed "adult" position of the client-type dictionary (the v0.21.0 schema migration).
    private const CLIENT_TYPE_ADULT = 'd1c57dfc-c118-49ff-ae38-6585645349ca';

    private Facility $facility;
    private string $clientUserId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
        Attribute::clearCacheAll();
        $this->facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($this->facility, user: User::factory()->create());

        $result = $this->post(sprintf('/api/v1/facility/%s/user/client', $this->facility->id), [
            'name' => 'Test Client',
            'client' => [
                'typeDictId' => self::CLIENT_TYPE_ADULT,
                'notificationMethodDictIds' => [NotificationMethod::Sms->value],
            ],
        ]);
        $result->assertCreated();
        $this->clientUserId = $result->json('data.id');

        $this->createAttendance('2030-05-01');
        $this->createAttendance('2030-05-02');
    }

    private function createAttendance(string $date): void
    {
        $meeting = new Meeting();
        $meeting->fill([
            'facility_id' => $this->facility->id,
            'date' => $date,
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
            'user_id' => $this->clientUserId,
            'attendance_type_dict_id' => AttendanceType::Client->value,
            'attendance_status_dict_id' => MeetingAttendant::ATTENDANCE_STATUS_OK,
            'default_order' => 1,
        ]);
        $attendant->saveOrFail();
    }

    private function patchNotificationMethods(array $data): TestResponse
    {
        return $this->patch(
            sprintf(
                '/api/v1/facility/%s/user/client/%s/notification/method',
                $this->facility->id,
                $this->clientUserId,
            ),
            $data,
        );
    }

    private function addSmsNotifications(): TestResponse
    {
        return $this->patchNotificationMethods(['addMeetingMethodDictId' => NotificationMethod::Sms->value]);
    }

    private function countNotifications(): int
    {
        return Notification::query()->where('user_id', $this->clientUserId)->count();
    }

    public function testAddsNotificationsForAllFutureMeetings(): void
    {
        $result = $this->addSmsNotifications();

        $result->assertOk();
        self::assertSame(['added' => 2, 'removed' => 0], $result->json('data'));
        self::assertSame(2, $this->countNotifications());
    }

    public function testFailureForOneMeetingSavesNoNotifications(): void
    {
        $created = 0;
        Notification::creating(function () use (&$created) {
            if (++$created === 2) {
                throw new RuntimeException('Simulated failure');
            }
        });

        $this->addSmsNotifications()->assertServerError();
        self::assertSame(0, $this->countNotifications());
    }

    public function testAddsClientMethodsForAllFutureMeetings(): void
    {
        $result = $this->patchNotificationMethods(['addMeetingClientMethods' => true]);

        $result->assertOk();
        self::assertSame(['added' => 2, 'removed' => 0], $result->json('data'));
        self::assertSame(2, $this->countNotifications());
    }

    public function testNotAddingClientMethodsAddsNothing(): void
    {
        $result = $this->patchNotificationMethods(['addMeetingClientMethods' => false]);

        $result->assertOk();
        self::assertSame(['added' => 0, 'removed' => 0], $result->json('data'));
        self::assertSame(0, $this->countNotifications());
    }
}
