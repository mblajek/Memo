<?php

namespace App\Services\Member;

use App\Models\Client;
use App\Models\Grant;
use App\Models\Member;
use App\Models\StaffMember;
use Illuminate\Support\Facades\DB;
use Throwable;

class UpdateMemberService
{
    /**
     * @throws Throwable
     */
    public function update(Member $member, array $data): void
    {
        DB::transaction(fn() => $this->fill($member, $data));
    }

    public function create(array $data): string
    {
        $member = new Member();
        DB::transaction(function () use ($data, $member) {
            $member->facility_id = $data['facility_id'];
            $member->user_id = $data['user_id'];
            $member->save();
            $this->fill($member, $data);
        });
        return $member->id;
    }

    /**
     * @throws Throwable
     */
    private function fill(Member $member, array $data): void
    {
        if (array_key_exists('has_facility_admin', $data)) {
            $grant = Grant::query()->find($member->facility_admin_grant_id);
            if ($data['has_facility_admin']) {
                if ($grant === null) {
                    $grant = Grant::create();
                }
            } else {
                $grant?->delete();
            }
            $data['facility_admin_grant_id'] = $grant?->id;
        }

        if (array_key_exists('is_facility_client', $data)) {
            $client = Client::query()->find($member->client_id);
            if ($data['is_facility_client']) {
                if ($client === null) {
                    $client = new Client();
                    $client->save();
                }
            } else {
                $client?->delete();
            }
            $data['client_id'] = $client?->id;
        }

        if (array_key_exists('is_facility_staff', $data)) {
            $staff = StaffMember::query()->find($member->client_id);
            if ($data['is_facility_staff']) {
                if ($staff === null) {
                    $staff = new StaffMember();
                    $staff->save();
                }
            } else {
                $staff?->delete();
            }
            $data['staff_member_id'] = $staff?->id;
        }

        $member->update($data);
    }
}
