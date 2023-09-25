<?php

namespace App\Http\Controllers;

use App\Exceptions\FatalExceptionFactory;
use App\Http\Permissions\Permission;
use App\Http\Permissions\PermissionDescribe;
use App\Mail\BasicMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use OpenApi\Attributes as OA;
use Throwable;

class MailController extends ApiController
{
    protected function initPermissions(): void
    {
        $this->permissionOneOf(Permission::verified, Permission::unverified);
    }

    #[OA\Post(
        path: '/api/v1/mail/test',
        description: new PermissionDescribe([Permission::verified, Permission::unverified]),
        summary: 'Mail test',
        tags: ['Mail'],
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 401, description: 'Unauthorised'),
        ]
    )]
    public function test(): JsonResponse
    {
        try {
            Mail::to($this->getUserOrFail()->email)->send(new BasicMail(BasicMail::TYPE_TEST));
        } catch (Throwable) {
            throw FatalExceptionFactory::unexpected();
        }
        return new JsonResponse();
    }
}
