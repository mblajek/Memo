<?php

namespace App\Http\Controllers;

use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Mail\Test;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use OpenApi\Attributes as OA;

class MailController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::any);
    }

    #[OA\Post(
        path: '/api/v1/mail/test',
        description: new PermissionDescribe(Permission::any),
        summary: 'Mail test',
        tags: ['Mail'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 400, description: 'Bad Request'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function test(): JsonResponse
    {
        Mail::to('some_email')->send(new Test());

        return new JsonResponse();
    }
}
