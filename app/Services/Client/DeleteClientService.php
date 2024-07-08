<?php

namespace App\Services\Client;

use App\Models\Facility;
use App\Models\Member;
use Illuminate\Support\Facades\DB;

class DeleteClientService
{
    public function deduplicate(
        Facility $facility,
        Member $member,
        string $duplicateOf,
    ): array {
        // todo: replace in groups and meetings
        return [];
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
            && !$user->members()->whereNot('id', $member->id)->exists();

        DB::transaction(function () use ($member, $client, $user, $deleteMember, $deleteUser) {
            // todo: delete from groups or existence of groups block deleting
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
