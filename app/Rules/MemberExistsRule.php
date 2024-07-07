<?php

namespace App\Rules;

use App\Exceptions\FatalExceptionFactory;
use App\Http\Permissions\PermissionMiddleware;
use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\User;
use Closure;

final class MemberExistsRule extends AbstractRule
{
    private readonly ?Facility $facility;

    public function __construct(
        // todo: another enum or bool
        private readonly ?AttendanceType $attendanceType = null,
        ?Facility $facility = null,
    ) {
        $facility = $facility ?? PermissionMiddleware::permissions()->facility;
        if (!$facility) {
            FatalExceptionFactory::unexpected()->throw();
        }
        $this->facility = $facility;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $builder = User::query()
            ->join('members', 'members.user_id', 'users.id')
            ->where('users.id', $value)
            ->where('members.facility_id', $this->facility->id);
        if ((match ($this->attendanceType) {
            AttendanceType::Staff => $builder->whereNotNull('members.staff_member_id'),
            AttendanceType::Client => $builder->whereNotNull('members.client_id'),
            null => $builder,
        })->exists()) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.member_exists', ['member_type' => $this->attendanceType->value]);
    }
}
