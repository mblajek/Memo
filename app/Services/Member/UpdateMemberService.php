<?php

namespace App\Services\Member;

use App\Models\Grant;
use App\Models\Member;
use Illuminate\Support\Facades\DB;
use Throwable;

class UpdateMemberService
{
    /**
     * @throws Throwable
     */
    public function handle(Member $member, array $data): void
    {
        DB::transaction(fn() => $this->update($member, $data));
    }

    /**
     * @throws Throwable
     */
    private function update(Member $member, array $data): void
    {
        if (array_key_exists('has_facility_admin', $data)) {
            $grant = Grant::query()->find($member->facility_admin_grant_id);

            if ($data['has_facility_admin']) {
                if ($grant === null) {
                    $grant = Grant::createForUser();
                }
            } else {
                $grant?->delete();
            }

            $data['facility_admin_grant_id'] = $grant?->id;
        }

        $member->update($data);
    }
}
