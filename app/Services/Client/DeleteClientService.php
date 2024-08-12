<?php

namespace App\Services\Client;

use App\Models\MeetingAttendant;
use App\Models\Member;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

class DeleteClientService
{
    public function deduplicate(
        Member $member,
        string $duplicateOf,
    ): array {
        // todo: replace in groups
        $attendances = MeetingAttendant::query()
            ->select(['meeting_attendants.id as current_id', 'dest_meeting_attendants.id as dest_id'])
            ->leftJoin(
                'meeting_attendants as dest_meeting_attendants',
                function (JoinClause $join) use ($duplicateOf) {
                    $join->on('dest_meeting_attendants.meeting_id', 'meeting_attendants.meeting_id');
                    $join->where('dest_meeting_attendants.user_id', $duplicateOf);
                }
            )
            ->where('meeting_attendants.user_id', $member->user_id)
            ->get()->pluck('dest_id', 'current_id')->toArray();
        // duplicateOf isn't attendant of meeting, old attendance should be updated to duplicateOf
        $attendancesToUpdate = [];
        // duplicateOf is attendant of meeting, old attendance should be deleted
        $attendancesToDelete = [];
        foreach ($attendances as $currentId => $destId) {
            if ($destId) {
                $attendancesToDelete [] = $currentId;
            } else {
                $attendancesToUpdate [] = $currentId;
            }
        }
        return DB::transaction(
            function () use ($attendancesToDelete, $attendancesToUpdate, $duplicateOf, $member): array {
                MeetingAttendant::query()->whereIn('id', $attendancesToDelete)->delete();
                MeetingAttendant::query()->whereIn('id', $attendancesToUpdate)->update(['user_id' => $duplicateOf]);
                return $this->delete($member);
            }
        );
    }

    /**
     * @param Member $member
     * @return array{clientDeleted: true, memberDeleted: bool, userDeleted: bool}
     */
    public function delete(
        Member $member,
    ): array {
        $client = $member->client;
        $user = $member->user;
        $deleteMember = $member->staff_member_id === null && $member->facility_admin_grant_id === null;
        $deleteUser = $deleteMember
            && $user->managed_by_facility_id === $member->facility_id
            && !$user->members()->whereNot('id', $member->id)->exists()
            && !$user->isUsedInTables(omit: ['members.user_id']);

        DB::transaction(function () use ($member, $client, $user, $deleteMember, $deleteUser) {
            // todo: delete from groups or existence of groups blocks deleting
            if ($deleteMember) {
                $member->delete();
            } else {
                $member->client_id = null;
                $member->save();
            }
            $client->values()->delete();
            $client->delete();
            if ($deleteUser) {
                $user->delete();
            }
        });
        return ['clientDeleted' => true, 'memberDeleted' => $deleteMember, 'userDeleted' => $deleteUser];
    }
}
