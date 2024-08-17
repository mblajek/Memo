<?php

namespace App\Rules;

use App\Exceptions\FatalExceptionFactory;
use App\Http\Permissions\PermissionMiddleware;
use App\Models\ClientGroup;
use App\Models\Facility;
use Closure;

final class MeetingClientGroupRule extends AbstractRule
{
    private readonly ?Facility $facility;

    public function __construct(
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
        $clientGroupId = $value['client_group_id'] ?? null;
        if ($clientGroupId === null) {
            return;
        }
        $userId = $value['user_id'] ?? null;
        if (is_string($clientGroupId) && is_string($userId) && ClientGroup::query()
                ->join('group_clients', 'group_clients.client_group_id', 'client_groups.id')
                ->where('client_groups.id', $clientGroupId)
                ->where('client_groups.facility_id', $this->facility->id)
                ->where('group_clients.user_id', $userId)
                ->exists()) {
            return;
        }

        $this->validator->addFailure($attribute, 'custom.group_client_exists');
    }
}
