<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObject;
use App\Models\Grant;
use App\Models\User;
use DateTimeImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CreateUserCommand extends Command
{
    protected $signature = 'fz:user';
    protected $description = 'Create new user';

    public function handle(): void
    {
        PermissionMiddleware::setPermissions(
            new PermissionObject(
                user: User::query()->findOrFail(User::SYSTEM),
                facility: null,
                unauthorised: false,
                unverified: true,
                verified: true,
                globalAdmin: true,
                facilityMember: false,
                facilityClient: false,
                facilityStaff: false,
                facilityAdmin: false,
                developer: false,
            )
        );
        $user = User::query()->newModelInstance();
        $user->created_by = User::SYSTEM;
        $globalAdminGrant = null;
        do {
            $user->name = $this->ask('Name (with surname)');
        } while (!$user->name);
        do {
            if ($user->email) {
                $this->error('User already exists');
            }
            $user->email = $this->ask('E-mail (optional)');
        } while ($user->email && User::query()->where('email', $user->email)->exists());
        if ($user->email) {
            $user->email_verified_at = $this->confirm('Mark e-mail as confirmed', true) ? (new DateTimeImmutable(
            )) : null;
            $password = $this->secret('Password');
            $user->password = $password ? Hash::make($password) : null;
            if ($this->confirm('Grant global admin permission', false)) {
                $globalAdminGrant = Grant::query()->newModelInstance();
                $globalAdminGrant->created_by = User::SYSTEM;
            }
            $user->password_expire_at = $this->confirm('Mark password as expired?', false) ? new DateTimeImmutable(
            ) : null;
        }
        DB::transaction(function () use ($user, $globalAdminGrant) {
            if ($globalAdminGrant) {
                $globalAdminGrant->saveOrFail();
                $user->global_admin_grant_id = $globalAdminGrant->id;
            }
            $user->saveOrFail();
        });
        $this->line("Created user $user->id");
        PermissionMiddleware::setPermissions(null);
    }
}
