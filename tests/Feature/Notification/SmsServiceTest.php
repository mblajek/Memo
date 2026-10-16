<?php

namespace Tests\Feature\Notification;

use App\Notification\Dev\SmsDevService;
use App\Notification\Sms\SmsService;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Tests\TestCase;

class SmsServiceTest extends TestCase
{
    private const string CONFIG_SERVICES = 'services.sms.services';

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        App::instance(SmsDevService::class, new readonly class () extends SmsDevService {
            public function sendPreparedSms(string $number, string $message): void
            {
            }
        });
    }

    private static function sendSms(?string $services): ?string
    {
        Config::set(self::CONFIG_SERVICES, $services);
        return App::make(SmsService::class)->sendSms(number: '48123456789', message: 'Test');
    }

    public function testReturnsTrimmedServiceName(): void
    {
        self::assertSame('sms:dev', self::sendSms('dev'));
        self::assertSame('sms:dev', self::sendSms(' dev , play'));
    }

    public function testFailsClearlyWhenServicesNotConfigured(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('[' . self::CONFIG_SERVICES . ']');
        self::sendSms(null);
    }
}
