<?php

namespace App\Models;

use App\Models\QueryBuilders\LogEntryBuilder;
use App\Models\Traits\HasUuid;
use App\Models\Traits\HasValidator;
use App\Rules\Valid;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;
use Psr\Log\LogLevel;

/**
 * @property string id
 * @property CarbonImmutable created_at
 * @property CarbonImmutable updated_at
 * @property string $app_version
 * @property ?string $user_id
 * @property string $source
 * @property ?string $client_ip
 * @property ?string $user_agent_text_id
 * @property string $log_level
 * @property string $message
 * @property ?string $context_text_id
 * @method static LogEntryBuilder query()
 * @mixin Model
 */
class LogEntry extends Model
{
    use HasFactory;
    use HasUuid;

    // use BaseModel; - no created_by/updated_by
    use HasValidator;

    //@formatter:off
    public const array LEVELS = [LogLevel::DEBUG, LogLevel::INFO, LogLevel::NOTICE, LogLevel::WARNING,
        LogLevel::ERROR, LogLevel::CRITICAL, LogLevel::ALERT, LogLevel::EMERGENCY];
    public const array SOURCES = ['api_fe_js_error', 'api_fe_feature_use',
        'user_login_success', 'user_login_failure', 'user_login_unknown', 'user_password_change',
    ];
    //@formatter:on

    protected $table = 'log_entries';

    protected $fillable = [
        'app_version',
        'user_id',
        'source',
        'client_ip',
        'user_agent_text_id',
        'log_level',
        'message',
        'context_text_id',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'source' => Valid::trimmed([Rule::in(self::SOURCES), 'starts_with:api_']),
            'log_level' => Valid::trimmed([Rule::in(self::LEVELS)]),
            'message' => Valid::text(),
            'context' => Valid::text(sometimes: true, nullable: true, max: 150_000),
        };
    }
}
