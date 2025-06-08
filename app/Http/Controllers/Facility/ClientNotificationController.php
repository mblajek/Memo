<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Models\Client;
use App\Models\Enums\AttendanceType;
use App\Models\Enums\NotificationMethod;
use App\Models\Facility;
use App\Models\MeetingAttendant;
use App\Models\Notification;
use App\Models\User;
use App\Models\UuidEnum\ClientAttributeUuidEnum;
use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Notification\Meeting\MeetingNotification;
use App\Notification\Meeting\MeetingNotificationService;
use App\Rules\Valid;
use App\Utils\OpenApi\FacilityParameter;
use App\Utils\OpenApi\UserParameter;
use DateTimeImmutable;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

class ClientNotificationController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::facilityAdmin);
    }

    #[OA\Patch(
        path: '/api/v1/facility/{facility}/user/client/{user}/notification/method',
        description: new PermissionDescribe([Permission::facilityAdmin]),
        summary: 'Change notification methods',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'removeMeetingMethodDictId',
                        description: 'not implemented yet',
                        type: 'string',
                        format: 'uuid',
                    ),
                    new OA\Property(
                        property: 'removeMethodDictId',
                        description: 'not implemented yet',
                        type: 'string',
                        format: 'uuid',
                    ),
                    new OA\Property(
                        property: 'addMeetingMethodDictId',
                        type: 'string',
                        format: 'uuid',
                    ),
                    new OA\Property(
                        property: 'addMeetingClientMethods',
                        type: 'bool',
                    ),
                ],
            ),
        ),
        tags: ['Facility client'],
        parameters: [
            new FacilityParameter(),
            new UserParameter(),
        ],
        responses: [
            new OA\Response(
                response: 200, description: 'OK', content: new OA\JsonContent(properties: [
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'added', type: 'int'),
                    new OA\Property(property: 'removed', type: 'int'),
                ], type: 'object'),
            ]),
            ),
        ]
    )]
    public function patch(
        Facility $facility,
        User $user,
        MeetingNotificationService $meetingNotificationService,
    ): JsonResponse {
        $now = new DateTimeImmutable();
        $member = $user->belongsToFacilityOrFail($facility, isClient: true);
        $client = $member->client;

        $data = $this->validate([
            'remove_meeting_method_dict_id' => Valid::dict(DictionaryUuidEnum::NotificationMethod, sometimes: true),
            'remove_method_dict_id' => Valid::dict(DictionaryUuidEnum::NotificationMethod, sometimes: true),
            'add_meeting_method_dict_id' => Valid::dict(DictionaryUuidEnum::NotificationMethod, sometimes: true),
            'add_meeting_client_methods' => Valid::bool(['accepted'], sometimes: true),
        ]);

        $addMeetingMethods = $this->getAddMeetingMethods($client, $data);
        $countRemoved = $countAdded = 0;

        $attendances = MeetingAttendant::query()
            ->join('meetings', 'meetings.id', 'meeting_attendants.meeting_id')
            ->where('meetings.facility_id', $facility->id)
            ->where('meeting_attendants.user_id', $user->id)
            ->where('meeting_attendants.attendance_type_dict_id', AttendanceType::Client)
            ->where('meetings.date', '>=', $now)
            ->with(['meeting'])
            ->get();

        $notifications = Notification::query()
            ->where('facility_id', $facility->id)
            ->where('user_id', $user->id)
            ->whereIn('meeting_id', $attendances->pluck('meeting_id'))
            ->get()
            ->groupBy('meeting_id');

        foreach ($attendances as $attendance) {
            $notificationMethodsToAdd = $addMeetingMethods;
            /** @var Notification $meetingNotification */
            foreach ($notifications->get($attendance->meeting_id, []) as $meetingNotification) {
                $notificationMethodsToAdd = array_filter(
                    $notificationMethodsToAdd,
                    fn(NotificationMethod $method): bool
                        => $method !== $meetingNotification->notification_method_dict_id,
                );
                if (!$notificationMethodsToAdd) {
                    continue 2;
                }
            }

            $attendance->meeting->setRelation('facility', $facility);
            $attendance->meeting->notifications()->saveMany(
                $meetingNotificationService->create(
                    $attendance->meeting,
                    array_map(fn(NotificationMethod $notificationMethod): MeetingNotification
                        => new MeetingNotification(
                        userId: $attendance->user_id,
                        notificationMethodDictId: $notificationMethod,
                        meetingAttendant: $attendance,
                    ), $notificationMethodsToAdd),
                ),
            );
            $countAdded += count($notificationMethodsToAdd);
        }

        return new JsonResponse(['data' => ['added' => $countAdded, 'removed' => $countRemoved]]);
    }

    /**
     * @return list<NotificationMethod>
     */
    private function getAddMeetingMethods(Client $client, array $data): array
    {
        $addMeetingMethods = [];
        if (array_key_exists('add_meeting_method_dict_id', $data)) {
            $addMeetingMethods[] = NotificationMethod::from($data['add_meeting_method_dict_id']);
        }
        if (array_key_exists('add_meeting_client_methods', $data) && $data['add_meeting_client_methods']) {
            foreach ($client->attrValue(ClientAttributeUuidEnum::NotificationMethods) as $clientMethod) {
                $addMeetingMethods[] = NotificationMethod::from($clientMethod);
            }
        }
        return array_unique($addMeetingMethods, SORT_REGULAR);
    }
}
