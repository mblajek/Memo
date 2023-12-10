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
            'passwordExpireAt' => self::now(),
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
            'passwordExpireAt' => self::now(),
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
            'passwordExpireAt' => self::now(),
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
                            "other" => "hasGlobalAdmin"
                        ]
                    ]
                ]
            ]
        );
    }

    public function testWithNullPasswordExpireAtSucceeds(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'hasPassword' => false,
            'password' => null,
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
        $this->assertNotNull(User::query()->where('id', $result->json('data.id'))->first()->id);
    }

    public function testWithEmailButWithEmailVerifiedNullFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => null,
            'hasPassword' => true,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => self::now(),
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
                    "field" => "hasEmailVerified",
                    "code" => "validation.required_with",
                    "data" => [
                        "values" => [
                            "email"
                        ]
                    ]
                ]
            ]
        ]);
    }

    public function testWithEmailButWithoutEmailVerifiedFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasPassword' => true,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => self::now(),
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
                    "field" => "hasEmailVerified",
                    "code" => "validation.required_with",
                    "data" => [
                        "values" => [
                            "email"
                        ]
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
            'hasPassword' => true,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => self::now(),
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
                        "field" => "email",
                        "code" => "validation.required_if_accepted",
                        "data" => [
                            "other" => "hasPassword"
                        ]
                    ]
                ]
            ]
        );
    }

    public function testWithoutEmailButWithPasswordFieldFails(): void
    {
        $data = [
            'name' => 'Test',
            'email' => null,
            'hasPassword' => true,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => self::now(),
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
                        "field" => "email",
                        "code" => "validation.required_if_accepted",
                        "data" => [
                            "other" => "hasPassword"
                        ]
                    ]
                ]
            ]
        );
    }

    public function testWithPasswordButWithPasswordExpireAtNullFieldSucceeds(): void
    {
        $data = [
            'name' => 'Test',
            'email' => 'test@test.pl',
            'hasEmailVerified' => false,
            'hasPassword' => true,
            'password' => self::VALID_PASSWORD,
            'passwordExpireAt' => null,
            'hasGlobalAdmin' => false,
        ];

        $result = $this->post(static::URL, $data);

        $result->assertCreated();
    }
}
