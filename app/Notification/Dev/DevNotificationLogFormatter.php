<?php

namespace App\Notification\Dev;

use App\Utils\Date\DateHelper;
use Illuminate\Log\Logger;
use Monolog\Formatter\FormatterInterface;
use Monolog\Handler\Handler;
use Monolog\Level;
use Monolog\LogRecord;

class DevNotificationLogFormatter implements FormatterInterface
{
    public function __invoke(Logger $logger)
    {
        /** @var Handler $handler */
        /** @noinspection PhpUndefinedMethodInspection */
        foreach ($logger->getHandlers() as $handler) {
            /** @noinspection PhpPossiblePolymorphicInvocationInspection */
            $handler->setFormatter($this);
        }
    }

    public function format(LogRecord $record): string
    {
        $contextArray = $record->context;
        $type = strtoupper($contextArray['type'] ?? '???');
        unset($contextArray['type']);

        $datetime = DateHelper::toZuluString($record->datetime);
        $message = "\n" . implode("\n", array_map(fn(string $line) => //
            "    $line", explode("\n", $record->message)));
        $context = implode(', ', array_map(fn(string $key, string $value) => //
        "$key: $value", array_keys($contextArray), $contextArray));

        return (($record->level === Level::Info) ? '' : "{$record->level->getName()} ")
            . "[$datetime] $type {{$context}}" . $message . "\n";
    }

    public function formatBatch(array $records): string
    {
        return implode('', array_map($this->format(...), $records));
    }
}
