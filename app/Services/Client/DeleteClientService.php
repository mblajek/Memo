<?php

namespace App\Services\Client;

use App\Models\Enums\AttendanceType;
use App\Models\Member;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

class DeleteClientService
{
    /**
     * Moves the client's attendances and group memberships in the member's facility to the user
     * $duplicateOf (dropping those where $duplicateOf is already present), then deletes the client.
     */
    public function deduplicate(
        Member $member,
        string $duplicateOf,
    ): array {
        return DB::transaction(function () use ($member, $duplicateOf): array {
            foreach ([
                ['meeting_attendants', 'meeting_id', 'meetings'],
                ['group_clients', 'client_group_id', 'client_groups'],
            ] as [$table, $parentColumn, $parentTable]) {
                $destTable = "dest_$table";
                $query = DB::table($table)
                    ->select(["$table.id as current_id", "$destTable.id as dest_id"])
                    ->join($parentTable, "$parentTable.id", "$table.$parentColumn")
                    ->leftJoin(
                        "$table as $destTable",
                        function (JoinClause $join) use ($duplicateOf, $table, $destTable, $parentColumn) {
                            $join->on("$destTable.$parentColumn", "$table.$parentColumn");
                            $join->where("$destTable.user_id", $duplicateOf);
                        }
                    )
                    ->where("$parentTable.facility_id", $member->facility_id)
                    ->where("$table.user_id", $member->user_id);
                if ($table === 'meeting_attendants') {
                    $query->where("$table.attendance_type_dict_id", AttendanceType::Client->value);
                }
                /** @var array<non-falsy-string, ?non-falsy-string> $occurrences currentId => destId */
                $occurrences = $query->lockForUpdate()->get()->pluck('dest_id', 'current_id')->toArray();
                // duplicateOf is already "attendant of meeting"/"group client": the old item is deleted
                DB::table($table)->whereIn('id', array_keys(array_filter($occurrences)))->delete();
                // otherwise the old item is moved to duplicateOf
                DB::table($table)
                    ->whereIn('id', array_keys(array_filter($occurrences, fn(?string $destId) => !$destId)))
                    ->update(['user_id' => $duplicateOf]);
            }
            return $this->delete($member);
        });
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
            && !$user->isUsedInTables(omit: ['members.user_id', 'clients.user_id']);

        DB::transaction(function () use ($member, $client, $user, $deleteMember, $deleteUser) {
            if ($deleteMember) {
                $member->delete();
            } else {
                $member->client_id = null;
                $member->save();
            }
            $client->delete();
            if ($deleteUser) {
                $user->delete();
            }
        });
        return ['clientDeleted' => true, 'memberDeleted' => $deleteMember, 'userDeleted' => $deleteUser];
    }
}
