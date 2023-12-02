<?php

namespace App\Services\Member;

use App\Models\Grant;
use App\Models\Member;
use Throwable;

class CreateMemberService
{
    /**
     * @throws Throwable
     */
    public function handle(array $data): string
    {
        $member = new Member();

        $member->facility_id = $data['facility_id'];
        $member->user_id = $data['user_id'];
        $member->facility_admin_grant_id = $data['has_facility_admin'] ? Grant::create()->id : null;

        $member->saveOrFail();

        return $member->id;
    }
}
