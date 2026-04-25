<?php

namespace App\Http\Middleware;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Client;
use App\Models\Enums\AttributeTable;
use App\Models\EventOut;
use App\Models\IntegrationEventOut;
use App\Models\Meeting;
use App\Models\User;
use App\Models\Value;
use App\Services\IntegrationEvents\IntegrationEventType;
use App\Utils\Date\DateHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Nette\Utils\DateTime;
use Symfony\Component\HttpFoundation\Response;

class SendIntegrationEvents
{
    private static array $events = [];
    private static bool $initialized = false;

    public function handle(Request $request, \Closure $next): Response
    {
        if (!Config::offsetExists('database.connections.integration_events.database')) {
            return $next($request);
        }

        self::$initialized = true;
        $response = $next($request);
        $this->flushEvents();
        return $response;
    }

    public static function isInitialized(): bool
    {
        return self::$initialized;
    }

    public static function addUserEvents(Model $model): void
    {
        if (!self::$initialized || ($model instanceof EventOut)) {
            return;
        }

        if ($model instanceof Meeting) {
            foreach ($model->attendants()->get() as $attendant) {
                self::addUserEvents($attendant);
            }
            return;
        }
        if ($model instanceof Value) {
            $userId = match ($model->attribute()->table) {
                AttributeTable::User => $model->object_id,
                AttributeTable::Client, AttributeTable::StaffMember
                => Client::findOrFail($model->object_id)->user_id,
                default => null
            };
        } else {
            $userId = $model->getAttribute(($model instanceof User) ? 'id' : 'user_id');
        }

        if (!$userId) {
            return;
        }

        if ($facilityId = PermissionMiddleware::permissions()->facility?->id) {
            $facilityIds = [$facilityId];
        } else {
            $facilityIds = User::find($userId)?->members()->pluck('facility_id')->all() ?? [];
        }

        foreach ($facilityIds as $facilityId) {
            if (isset(self::$events[$facilityId][IntegrationEventType::user->name][$userId])) {
                continue;
            }

            $event = new IntegrationEventOut();

            $event->facility_id = $facilityId;
            $event->type = IntegrationEventType::user;
            $event->object_id = $userId;

            self::$events[$facilityId][IntegrationEventType::user->name][$userId] = $event;
        }
    }

    private function flushEvents(): void
    {
        if (self::$events) {
            IntegrationEventOut::query()
                ->where('created_at', '<', new DateTime('1 week ago midnight'))
                ->delete();
        }

        foreach (self::$events as $facilityEvents) {
            foreach ($facilityEvents as $typeEvents) {
                /** @var IntegrationEventOut $event */
                foreach ($typeEvents as $event) {
                    $event->saveOrFail();
                }
            }
        }
        self::$events = [];
    }
}
