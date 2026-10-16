<?php

namespace Tests\Feature\Notification;

use App\Notification\Dev\SmsDevService;
use App\Notification\Sms\SmsService;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class SmsServiceTest extends TestCase
{
    private const string ENV_SERVICES = 'SMS_SERVICES';

    private array $savedEnv;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        App::instance(SmsDevService::class, new readonly class () extends SmsDevService {
            public function sendPreparedSms(string $number, string $message): void
            {
            }
        });
        $this->savedEnv = [
            'server' => $_SERVER[self::ENV_SERVICES] ?? null,
            'env' => $_ENV[self::ENV_SERVICES] ?? null,
            'putenv' => (getenv(self::ENV_SERVICES) === false) ? null : getenv(self::ENV_SERVICES),
        ];
    }

    protected function tearDown(): void
    {
        self::setEnvServices(...$this->savedEnv);
        parent::tearDown();
    }

    private static function setEnvServices(?string $server, ?string $env, ?string $putenv): void
    {
        if ($server === null) {
            unset($_SERVER[self::ENV_SERVICES]);
        } else {
            $_SERVER[self::ENV_SERVICES] = $server;
        }
        if ($env === null) {
            unset($_ENV[self::ENV_SERVICES]);
        } else {
            $_ENV[self::ENV_SERVICES] = $env;
        }
        putenv(($putenv === null) ? self::ENV_SERVICES : (self::ENV_SERVICES . "=$putenv"));
    }

    private static function sendSms(?string $services): ?string
    {
        self::setEnvServices($services, $services, $services);
        return App::make(SmsService::class)->sendSms(number: '48123456789', message: 'Test');
    }

    public function testReturnsTrimmedServiceName(): void
    {
        self::assertSame('sms:dev', self::sendSms('dev'));
        self::assertSame('sms:dev', self::sendSms(' dev , play'));
    }

    public function testFailsClearlyWhenServicesNotConfigured(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('[' . self::ENV_SERVICES . ']');
        self::sendSms(null);
    }
}
