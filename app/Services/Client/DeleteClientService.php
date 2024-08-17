<?php

namespace App\Services\Client;

use App\Models\Member;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

class DeleteClientService
{
    public function deduplicate(
        Member $member,
        string $duplicateOf,
    ): array {
        // duplicateOf isn't "attendant of meeting"/"group client", old items should be updated to duplicateOf
        $itemsToUpdate = [];
        // duplicateOf is "attendant of meeting"/"group client", old items should be deleted
        $itemsToDelete = [];
        foreach ([['meeting_attendants', 'meeting_id'], ['group_clients', 'client_group_id']] as [$table, $column]) {
            $destTable = "dest_$table";
            /** @var array<non-falsy-string, non-falsy-string> $occurrences currentId => destId */
            $occurrences = DB::table($table)
                ->select(["$table.id as current_id", "$destTable.id as dest_id"])
                ->leftJoin(
                    "$table as $destTable",
                    function (JoinClause $join) use ($duplicateOf, $table, $destTable, $column) {
                        $join->on("$destTable.$column", "$table.$column");
                        $join->where("$destTable.user_id", $duplicateOf);
                    }
                )
                ->where("$table.user_id", $member->user_id)
                ->get()->pluck('dest_id', 'current_id')->toArray();
            foreach ($occurrences as $currentId => $destId) {
                if ($destId) {
                    $itemsToDelete[$table] [] = $currentId;
                } else {
                    $itemsToUpdate[$table] [] = $currentId;
                }
            }
        }
        return DB::transaction(
            function () use ($itemsToDelete, $itemsToUpdate, $duplicateOf, $member): array {
                foreach ($itemsToDelete as $table => $items) {
                    DB::table($table)->whereIn('id', $items)->delete();
                }
                foreach ($itemsToUpdate as $table => $items) {
                    DB::table($table)->whereIn('id', $items)->update(['user_id' => $duplicateOf]);
                }
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
