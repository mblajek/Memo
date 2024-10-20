<?php

namespace App\Notification\Sms;

use Closure;
use Illuminate\Http\Client\HttpClientException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

readonly class SmsPlayService extends AbstractSmsService
{
    private const string URL_OAUTH_JWT =  'https://uslugidlafirm.play.pl/oauth/token-jwt';
    private const string URL_SMS_SEND = 'https://uslugidlafirm.play.pl/api/bramkasms/sendSms';

    private const string ENV_CLIENT_ID = 'SMS_PLAY_CLIENT_ID';
    private const string ENV_SECRET = 'SMS_PLAY_SECRET';
    private const string ENV_FROM_NUMBER = 'SMS_PLAY_FROM_NUMBER';
    protected const string ENV_FROM_NAME = 'SMS_PLAY_FROM_NAME';

    public function sendPreparedSms(string $number, string $message): void
    {
        $fromNumber = Env::get(self::ENV_FROM_NUMBER);
        $fromName = self::fromName();
        $this->exec(fn(array $jwt) => Http::withHeaders($jwt)
            ->post(self::URL_SMS_SEND, [
                'from' => $fromNumber,
                'fromName' => $fromName,
                'text' => $message,
                'to' => [$number],
            ])
        );
    }

    /** @throws HttpClientException */
    private function jwt(bool $alwaysRefresh): array
    {
        $jwt = $alwaysRefresh ? null : Cache::get('sms_play_jwt');
        if (!$jwt) {
            $basic = base64_encode(Env::get(self::ENV_CLIENT_ID) . ':' . Env::get(self::ENV_SECRET));
            $jwt = Http::withHeaders(['Authorization' => "Basic $basic"])
                ->post(self::URL_OAUTH_JWT)->throw()->object()->access_token;
            Cache::put('sms_play_jwt', $jwt);
        }
        return ['Authorization' => "Bearer $jwt"];
    }

    /*
    private function history()
    {
        $resp = $this->exec(fn(array $jwt) => Http::withHeaders($jwt)
            ->get('https://uslugidlafirm.play.pl/api/bramkasms/getSmsHistory', [
                'fromDate' => '2024-01-01 00:00',
                'toDate' => '2024-01-01 00:01',
            ])
        );
        print_r($resp->object());
    }
    */

    /** @throws HttpClientException */
    private function exec(Closure $callback): Response
    {
        /** @var Response $response */
        $response = $callback($this->jwt(false));
        if ($response->unauthorized() || $response->forbidden()) {
            $response = $callback($this->jwt(true));
        }
        return $response->throw();
    }
}
