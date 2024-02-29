<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\Permission;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;

class DeveloperController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::developer);
    }

    public function migrate(string $hash = ''): Response
    {
        Artisan::call('migrate:status');
        $status = Artisan::output();
        $statusHash = md5($status);
        if ($hash === $statusHash) {
            Artisan::call('migrate', ['--step' => true]);
            $statusHash = Artisan::output();
        }
        return new Response($status . $statusHash, headers: ['Content-Type' => 'text/plain']);
    }
}
