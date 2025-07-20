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
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property ?string $facility_id
 * @property ?string $user_id
 * // todo remove client_id fom database
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
 * @property-read ?Facility $facility
 * @property-read ?User $user
 * @property-read ?Meeting $meeting
 * @method static NotificationBuilder query()
 */
class Notification extends Model
{
    use HasFactory;
    use HasUuid;
    use BaseModel;
    use HasValidator;

    private Collection $deduplicated; // todo?: relation

    protected $table = 'notifications';

    protected $fillable = [
        'facility_id',
        'user_id',
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

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function addDeduplicated(self $notification): void
    {
        $this->deduplicated ??= new Collection();
        $this->deduplicated->add($notification);
    }

    /** @return Collection<array-key,self> */
    public function getDeduplicated(): Collection
    {
        $this->deduplicated ??= new Collection();
        return $this->deduplicated;
    }
}
