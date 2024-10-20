<?php

namespace App\Notification\Sms;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Notification\Dev\SmsDevService;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Http\Client\HttpClientException;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;

readonly class SmsService
{
    protected const int SMS_UNICODE_LENGTH = 70;
    protected const int SMS_MAX_LENGTH = 255;

    protected const string ENV_SERVICES = 'SMS_SERVICES';
    private const array SERVICES = [
        'dev' => SmsDevService::class,
        'play' => SmsPlayService::class,
    ];

    public function __construct(
        private ExceptionHandler $handler,
    ) {
    }

    /**
     * @throws HttpClientException|ApiException
     * @noinspection PhpDocMissingThrowsInspection
     */
    public function sendSms(
        string $number,
        string $message,
        ?bool $ascii = null,
    ): void {
        ['number' => $number, 'message' => $message] = self::prepareSms($number, $message, $ascii);

        $serviceClasses = array_map(
            fn(string $serviceShort) => self::SERVICES[trim($serviceShort)]
                ?? FatalExceptionFactory::unexpected()
                    ->setMessage("Invalid SMS service '$serviceShort'")->throw(),
            explode(',', Env::get(self::ENV_SERVICES))
        );

        $errors = [];
        $success = false;
        foreach ($serviceClasses as $serviceClass) {
            try {
                /** @var AbstractSmsService $service */
                $service = App::make($serviceClass);
                $service->sendPreparedSms($number, $message);
                $success = true;
                break;
            } catch (HttpClientException $clientError) {
                $errors [] = $clientError;
            }
        }
        $firstError = null;
        foreach ($errors as $error) {
            if ($firstError || $success) {
                /** @noinspection PhpUnhandledExceptionInspection */
                $this->handler->report($error);
            }
            $firstError ??= $error;
        }
        if ($firstError && !$success) {
            throw $firstError;
        }
    }

    /** @throws ApiException */
    public static function prepareSms(
        string $number,
        string $message,
        ?bool $ascii = null,
    ): array {
        $number = trim($number);
        $numberDigits = preg_replace('/^\+|[-\s]/', '', $number);
        $number = match (ctype_digit($numberDigits) ? strlen($numberDigits) : -1) {
            9 => "48$numberDigits",
            11 => $numberDigits,
            default => ExceptionFactory::smsInvalidNumberFormat($number)->throw(),
        };

        $message = trim($message);
        $message = ($ascii ?? (mb_strlen($message) > self::SMS_UNICODE_LENGTH))
            ? Str::ascii($message) : $message;
        $messageLength = mb_strlen($message);
        if ($messageLength > self::SMS_MAX_LENGTH) {
            ExceptionFactory::smsMessageTooLong(self::SMS_MAX_LENGTH, $messageLength)->throw();
        }

        return ['number' => $number, 'message' => $message];
    }
}
