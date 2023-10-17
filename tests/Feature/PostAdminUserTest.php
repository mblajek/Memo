<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class PostAdminUserTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    private const URL = '/api/v1/admin/user';

    public function testWithValidDataSucceeds(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => true,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithoutPasswordSucceeds(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => null,
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithoutEmailSucceeds(): void
    {
        $data = [
            'name' => 'Test',
            'email' => null,
            'password' => null,
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithoutGlobalAdminSucceeds(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithGlobalAdminTrueWithEmailSucceeds(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => true,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => true,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
    }

    public function testWithGlobalAdminTrueWithoutEmailFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => null,
            'hasEmailVerified' => null,
            'password' => null,
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => true,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
        $result->assertJson(
            [
                "errors" => [
                    [
                        "code" => "exception.validation"
                    ],
                    [
                        "field" => "email",
                        "code" => "validation.required_if_accepted",
                        "data" => [
                            "other" => "has_global_admin"
                        ]
                    ]
                ]
            ]);
    }

    public function testWithoutReferredFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => self::VALID_PASSWORD,
            //'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
    }

    public function testWithNullableReferredFieldSucceeds(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => null,
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithEmailButWithoutEmailVerifiedFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => null,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
        $result->assertJson([
            "errors" => [
                [
                    "code" => "exception.validation"
                ],
                [
                    "field" => "email",
                    "code" => "validation.custom.require_present",
                    "data" => [
                        "other" => "has_email_verified"
                    ]
                ]
            ]
        ]);
    }

    public function testWithoutEmailButWithEmailVerifiedFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => null,
            'hasEmailVerified' => false,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
        $result->assertJson(
            [
                "errors" => [
                    [
                        "code" => "exception.validation"
                    ],
                    [
                        "field" => "hasEmailVerified",
                        "code" => "validation.custom.require_present",
                        "data" => [
                            "other" => "email"
                        ]
                    ]
                ]
            ]);
    }

    public function testWithoutEmailButWithPasswordFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => null,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
        $result->assertJson(
            [
                "errors" => [
                    [
                        "code" => "exception.validation"
                    ],
                    [
                        "field" => "password",
                        "code" => "validation.custom.require_present",
                        "data" => [
                            "other" => "email"
                        ]
                    ]
                ]
            ]);
    }

    public function testWithPasswordButWithoutPasswordExpireAtFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
        $result->assertJson(
            [
                "errors" => [
                    [
                        "code" => "exception.validation"
                    ],
                    [
                        "field" => "password",
                        "code" => "validation.custom.require_present",
                        "data" => [
                            "other" => "password_expire_at"
                        ]
                    ]
                ]
            ]);
    }

    public function testWithoutPasswordButWithPasswordExpireAtFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'password' => null,
            'passwordExpireAt' => CarbonImmutable::now(),
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertBadRequest();
        $result->assertJson(
            [
                "errors" => [
                    [
                        "code" => "exception.validation"
                    ],
                    [
                        "field" => "passwordExpireAt",
                        "code" => "validation.custom.require_present",
                        "data" => [
                            "other" => "password"
                        ]
                    ]
                ]
            ]);
    }
}
