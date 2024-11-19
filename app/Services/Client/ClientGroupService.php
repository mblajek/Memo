<?php

namespace App\Services\Client;

use App\Http\Resources\ClientGroup\ClientGroupAssignedResource;
use App\Models\ClientGroup;
use App\Models\Facility;
use App\Models\GroupClient;
use App\Models\MeetingAttendant;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class ClientGroupService
{
    public function create(Facility $facility, array $data): string
    {
        $clientGroup = new ClientGroup($data);
        $clientGroup->facility_id = $facility->id;

        $clients = $this->extractClients($data) ?? [];

        DB::transaction(function () use ($clientGroup, $clients) {
            $clientGroup->save();
            $clientGroup->groupClients()->saveMany($clients);
        });

        return $clientGroup->id;
    }

    public function patch(ClientGroup $clientGroup, array $data): void
    {
        $clientGroup->fill($data);

        $finalClients = $this->extractPatchClients($data, $clientGroup);

        DB::transaction(function () use ($clientGroup, $finalClients) {
            $clientGroup->save();
            if ($finalClients !== null) {
                /** @var array<non-falsy-string, MeetingAttendant> $currentAttendants */
                $currentAttendants = $clientGroup->groupClients->keyBy('user_id')->all();
                /** @var array<non-falsy-string, MeetingAttendant> $newAttendants */
                [$userIdsToRemove, $newAttendants] = $finalClients;

                $clientGroup->groupClients()->whereIn('user_id', $userIdsToRemove)->delete();
                MeetingAttendant::query()
                    ->whereIn('user_id', $userIdsToRemove)
                    ->where('client_group_id', $clientGroup->id)
                    ->update(['client_group_id' => null]);

                foreach ($newAttendants as $userId => $newAttendant) {
                    if (array_key_exists($userId, $currentAttendants)) {
                        $currentAttendants[$userId]->update($newAttendant->attributesToArray());
                    } else {
                        $clientGroup->groupClients()->save($newAttendant);
                    }
                }
            }
        });
    }

    /** @return ?array<non-falsy-string, MeetingAttendant> */
    private function extractClients(array &$data): ?array
    {
        $clientsData = array_key_exists('clients', $data) ? ($data['clients'] ?: []) : null;
        unset($data['clients']);
        if ($clientsData === null) {
            return null;
        }
        $clients = [];
        foreach ($clientsData as $clientData) {
            $client = new GroupClient($clientData);
            $clients[$client->user_id] = $client;
        }
        return $clients;
    }

    public function extractPatchClients(array &$data, ClientGroup $clientGroup): ?array
    {
        $newClients = $this->extractClients($data);
        if ($newClients === null) {
            return null;
        }

        /** @var array<non-falsy-string, MeetingAttendant> $currentStaff */
        $currentClients = $clientGroup->groupClients->keyBy('user_id')->all();

        /** @var list<string> $userIdsToRemove */
        $userIdsToRemove = [];
        foreach ($currentClients as $userId => $currentAttendant) {
            if (!array_key_exists($userId, $newClients)) {
                $userIdsToRemove[] = $userId;
            }
        }

        return [$userIdsToRemove, $newClients];
    }

    public function assignToAttendants(
        string $facilityId,
        ?string $clientUserId,
        ?string $groupId,
        bool $replaceAll,
    ): JsonResource {
        $query = GroupClient::query()
            ->select(['group_clients.user_id'])
            ->selectRaw('max(group_clients.client_group_id) as client_group_id')
            ->selectRaw('count(1) as group_count')
            ->join('client_groups', 'client_groups.id', 'group_clients.client_group_id')
            ->where('client_groups.facility_id', $facilityId);
        if ($clientUserId) {
            $query->where('group_clients.user_id', $clientUserId);
        }
        if ($groupId) {
            $query->where('group_clients.client_group_id', $groupId);
        }
        $all = $query->groupBy(['group_clients.user_id'])->get()->groupBy(fn(GroupClient $groupClient) => //
            /** @var GroupClient|object $groupClient */ ($groupClient->group_count === 1) ? 'one' : 'many');

        /** @var GroupClient|object $groupClientToUpdate */
        foreach ($all->get('one', []) as $groupClientToUpdate) {
            $updateQuery = MeetingAttendant::query()
                ->join('meetings', 'meetings.id', 'meeting_attendants.meeting_id')
                ->where('meetings.facility_id', $facilityId)
                ->where('user_id', $groupClientToUpdate->user_id);
            if ($replaceAll) {
                $updateQuery->whereNot('client_group_id', $groupClientToUpdate->client_group_id);
            } else {
                $updateQuery->whereNull('client_group_id');
            }
            $groupClientToUpdate->update_count = $updateQuery
                ->update(['client_group_id' => $groupClientToUpdate->client_group_id]);
            $groupClientToUpdate->group_count = null;
        }
        return ClientGroupAssignedResource::make($all);
    }
}
