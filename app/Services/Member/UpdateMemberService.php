<?php

namespace App\Services\Member;

use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Models\Client;
use App\Models\Grant;
use App\Models\Member;
use App\Models\StaffMember;
use Closure;
use DateTimeImmutable;
use Illuminate\Database\Eloquent\Model;
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
        $fillOne = function (
            string $requestField,
            string $modelField,
            Closure $find,
            Closure $create
        ) use (&$data, $member): ?Model {
            if (!array_key_exists($requestField, $data)) {
                return null;
            }
            $itemId = $member->getAttribute($modelField);
            /** @var Grant|Client|StaffMember $item */
            $item = $itemId ? $find($itemId) : null;
            if ($data[$requestField]) {
                $item ??= $create();
                $item->exists ?: $item->save();
            } else {
                $item?->delete();
                $item = null;
            }
            $data[$modelField] = $item?->id;
            return $item;
        };

        $fillOne(
            requestField: 'has_facility_admin',
            modelField: 'facility_admin_grant_id',
            find: fn(string $id): ?Grant => Grant::query()->find($id),
            create: fn(): Grant => Grant::create(),
        );

        $fillOne(
            requestField: 'is_facility_client',
            modelField: 'client_id',
            find: fn(string $id): ?Client => Client::query()->find($id),
            // throw exception: client has some required fields
            create: fn() => ExceptionFactory::validation()->throw(),
        );


        $staffMember = $fillOne(
            requestField: 'is_facility_staff',
            modelField: 'staff_member_id',
            find: fn(string $id) => StaffMember::query()->find($id),
            create: fn() => new StaffMember(),
        );

        $this->setActiveStaff(
            dataActiveStaff: $data['is_active_facility_staff'] ?? null,
            staffMember: $staffMember ?? $member->staffMember
        );

        $member->update($data);
    }

    private function setActiveStaff(?bool $dataActiveStaff, ?StaffMember $staffMember): void
    {
        if ($dataActiveStaff && $staffMember === null) {
            FatalExceptionFactory::unexpected()->throw();
        }
        if ($dataActiveStaff === null || $staffMember === null || $dataActiveStaff === $staffMember->isActive()) {
            return;
        }

        $staffMember->deactivated_at = $dataActiveStaff
            ? null : new DateTimeImmutable();
        $staffMember->save();
    }
}
