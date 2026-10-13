<?php

namespace App\Models;

use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\NotificationTemplateRule;
use App\Rules\SvgIsValidRule;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * @property string $name
 * @property string $url
 * @property ?string $contact_phone
 * @property ?string $icon_svg
 * @property ?string $meeting_notification_template_subject
 * @property ?string $meeting_notification_template_message
 * @method static Builder<self> query()
 */
class Facility extends Model
{
    use BaseModel;
    use HasValidator;

    public const int ICON_SVG_MAX_LENGTH = 100_000;

    protected $table = 'facilities';

    protected $fillable = [
        'name',
        'url',
        'contact_phone',
        'icon_svg',
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
            'icon_svg' => Valid::text(
                [new SvgIsValidRule()],
                sometimes: true,
                nullable: true,
                max: self::ICON_SVG_MAX_LENGTH,
            ),
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

    /** A short hash of the icon, null if there is no icon. */
    public function iconHash(): ?string
    {
        return ($this->icon_svg === null) ? null : substr(hash('sha256', $this->icon_svg), 0, 12);
    }
}
