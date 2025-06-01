<?php

namespace App\Models;

use App\Models\QueryBuilders\FacilityBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\NotificationTemplateRule;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\Rule;

/**
 * @property string $name
 * @property string $url
 * @property ?string $timetable_id
 * @property ?string $contact_phone
 * @property ?string $meeting_notification_template_subject
 * @property ?string $meeting_notification_template_message
 * @property-read Timetable $timetable
 * @method static FacilityBuilder query()
 */
class Facility extends Model
{
    use BaseModel;
    use HasValidator;

    protected $table = 'facilities';

    protected $fillable = [
        'name',
        'url',
        'timetable_id',
        'contact_phone',
        'meeting_notification_template_subject',
        'meeting_notification_template_message',
    ];

    protected $casts = self::BASE_CASTS;

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'name' => Valid::trimmed(),
            'url' => Valid::trimmed([
                'lowercase',
                'regex:/^[a-z][a-z0-9-]+[a-z0-9]$/',
                'not_in:admin,user,api,system,login,help,home,dev,docs',
                Rule::unique('facilities', 'url'),
            ], max: 30),
            'contact_phone' => Valid::trimmed(sometimes: true, nullable: true),
            'meeting_notification_template_subject' => Valid::trimmed([
                new NotificationTemplateRule(acceptOuterTemplate: false),
            ], sometimes: true, nullable: true),
            'meeting_notification_template_message' => Valid::text([
                new NotificationTemplateRule(acceptOuterTemplate: false),
            ], sometimes: true, nullable: true),
        };
    }

    public function hasMeetingNotification(): bool
    {
        return $this->meeting_notification_template_subject !== null;
    }

    public function timetable(): BelongsTo
    {
        return $this->belongsTo(Timetable::class);
    }
}
