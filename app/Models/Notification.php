<?php

namespace App\Models;

use App\Models\Enums\NotificationMethod;
use App\Models\QueryBuilders\NotificationBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasUuid;
use App\Models\Traits\HasValidator;
use App\Notification\NotificationStatus;
use App\Rules\Valid;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property ?string $facility_id
 * @property ?string $user_id
 * @property ?string $client_id
 * @property ?string $meeting_id
 * @property NotificationMethod $notification_method_dict_id
 * @property ?string $address
 * @property string $subject - mail subject, sms message
 * @property ?string $message
 * @property ?string $message_html
 * @property CarbonImmutable $scheduled_at
 * @property ?string $service
 * @property NotificationStatus $status
 * @property ?string $error_log_entry_id
 * @method static NotificationBuilder query()
 * @mixin Model
 */
class Notification extends Model
{
    use HasFactory;
    use HasUuid;
    use BaseModel;
    use HasValidator;

    protected $table = 'notifications';

    protected $fillable = [
        'facility_id',
        'user_id',
        'client_id',
        'meeting_id',
        'notification_method_dict_id',
        'address',
        'subject',
        'message',
        'message_html',
        'scheduled_at',
        'service',
        'status',
        'error_log_entry_id',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'notification_method_dict_id' => NotificationMethod::class,
        'scheduled_at' => 'immutable_datetime',
        'status' => NotificationStatus::class,
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'subject' => Valid::trimmed(),
            'message' => Valid::text(),
        };
    }

    public function resetStatus(): void
    {
        $this->address = null;
        $this->service = null;
        $this->status = NotificationStatus::scheduled;
        $this->error_log_entry_id = null;
    }
}
