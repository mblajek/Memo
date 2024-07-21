<?php

namespace App\Rules;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Client;
use Closure;
use Illuminate\Database\Eloquent\Model;

final class ClientShortCodeRule extends AbstractRule implements IgnoreIdRule
{
    private readonly string $ignoreId;

    /** Client.id or User.id */
    public function ignore(Model|string $id): void
    {
        /** @var (Model&object{id:string})|string $id */
        $this->ignoreId = ($id instanceof Model) ? $id->id : $id;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === Client::EMPTY_SHORT_CODE) {
            return;
        }
        $builder = Client::query()
            ->join('members', 'members.client_id', 'clients.id')
            ->where('members.facility_id', PermissionMiddleware::facility()->id)
            ->whereRaw("trim(leading '0' from clients.short_code) = ?", ltrim($value, '0'));
        if ($this->ignoreId ?? null) {
            $builder->whereNot('members.client_id', $this->ignoreId);
            $builder->whereNot('members.user_id', $this->ignoreId);
        }
        if (!$builder->exists()) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.client_short_code');
    }
}
