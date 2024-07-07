<?php

namespace App\Services\Client;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Models\Facility;
use App\Models\Member;
use Illuminate\Support\Facades\DB;

class DeleteClientService
{
    public function deduplicate(Facility $facility, Member $member, string $duplicateOf)
    {
    }

    /** @throws ApiException */
    public function delete(Member $member): void
    {
        $client = $member->client;
        $user = $member->user;
        if ($user->members()->whereNot('id', $member->id)->exists()) {
            //todo another exception?
            ExceptionFactory::userNotManagedByFacility()->throw();
        }
        DB::transaction(function () use ($member, $client, $user) {
            $member->delete();
            $client->values()->delete();
            $client->delete();
            $user->delete();
        });
    }
}
