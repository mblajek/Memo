<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Notification\Sms\SmsService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * With a cached configuration `.env` is not loaded, so code running after boot must read settings
 * from config, not from the environment.
 */
class RequestTimeConfigTest extends TestCase
{
    private array $removedEnv = [];

    protected function tearDown(): void
    {
        foreach ($this->removedEnv as $name => [$server, $env, $putenv]) {
            if ($server !== null) {
                $_SERVER[$name] = $server;
            }
            if ($env !== null) {
                $_ENV[$name] = $env;
            }
            if ($putenv !== false) {
                putenv("$name=$putenv");
            }
        }
        $this->removedEnv = [];
        parent::tearDown();
    }

    private function removeEnv(string ...$names): void
    {
        foreach ($names as $name) {
            $this->removedEnv[$name] = [$_SERVER[$name] ?? null, $_ENV[$name] ?? null, getenv($name)];
            unset($_SERVER[$name], $_ENV[$name]);
            putenv($name);
        }
    }

    public function testDocsRemoteUsesConfiguredUrl(): void
    {
        $this->removeEnv('DOCS_URL');
        Config::set('app.docs_url', 'https://docs.test/docs/');
        Http::preventStrayRequests();
        Http::fake([
            'https://docs.test/docs/pl/request-time-config.md' => Http::response(
                '# Docs',
                headers: ['Content-Type' => 'text/markdown; charset=utf-8'],
            ),
        ]);

        $this->get('/docs-remote/pl/request-time-config.md')
            ->assertOk()
            ->assertContent('# Docs')
            ->assertHeader('Content-Type', 'text/markdown; charset=utf-8');
    }

    public function testStatusUsesConfiguredEnvColors(): void
    {
        $this->removeEnv('APP_ENV_COLOR', 'APP_ENV_FG_COLOR');
        Config::set('app.env_color', '#112233');
        Config::set('app.env_fg_color', '#445566');

        $this->get('/api/v1/system/status')
            ->assertOk()
            ->assertJsonPath('data.appEnvColor', '#112233')
            ->assertJsonPath('data.appEnvFgColor', '#445566');
    }

    public function testSmsUsesConfiguredServices(): void
    {
        $this->removeEnv(
            'SMS_SERVICES',
            'SMS_FROM_NAME',
            'SMS_NO_PROD_ADDR',
            'SMS_PLAY_CLIENT_ID',
            'SMS_PLAY_SECRET',
            'SMS_PLAY_FROM_NUMBER',
            'SMS_PLAY_FROM_NAME',
        );
        Config::set('services.sms', [
            'services' => 'play',
            'from_name' => 'Memo Test',
            'no_prod_addr' => '48111111111',
            'play' => [
                'client_id' => 'client',
                'secret' => 'secret',
                'from_number' => '48222222222',
                'from_name' => null,
            ],
        ]);
        Http::preventStrayRequests();
        Http::fake([
            'https://uslugidlafirm.play.pl/oauth/token-jwt' => Http::response(['access_token' => 'jwt']),
            'https://uslugidlafirm.play.pl/api/bramkasms/sendSms' => Http::response(),
        ]);

        $notification = new Notification(['address' => '+48 123 456 789', 'subject' => 'Test']);
        self::assertSame('sms:play', App::make(SmsService::class)->sendNotification($notification));

        Http::assertSent(fn(Request $request): bool
            => $request->url() === 'https://uslugidlafirm.play.pl/oauth/token-jwt'
            && $request->header('Authorization') === ['Basic ' . base64_encode('client:secret')]);
        Http::assertSent(fn(Request $request): bool
            => $request->url() === 'https://uslugidlafirm.play.pl/api/bramkasms/sendSms'
            && $request->header('Authorization') === ['Bearer jwt']
            && $request['from'] === '48222222222'
            && $request['fromName'] === 'Memo Test'
            && $request['to'] === ['48111111111']
            && $request['text'] === '48123456789> Test');
    }
}
