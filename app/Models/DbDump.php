<?php

namespace App\Models;

use App\Exceptions\FatalExceptionFactory;
use App\Models\QueryBuilders\DbDumpBuilder;
use App\Models\Traits\BaseModel;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use DateTimeImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @property DatabaseDumpStatus $status
 * @property ?string $name
 * @property ?int $file_size
 * @property string $app_version
 * @property DateTimeImmutable $restored_rc_at
 * @property DateTimeImmutable $restored_prod_at
 * @property bool $is_from_rc
 * @property bool $is_backuped
 * @method static DbDumpBuilder query()
 */
class DbDump extends Model
{
    use BaseModel;

    private const string NAME_DATETIME_FORMAT = 'Y-m-d_H-i-s';

    protected $connection = 'db_dumps';
    protected $table = 'db_dumps';

    protected $fillable = [
        'status',
        'name',
        'file_size',
        'app_version',
        'restored_rc_at',
        'restored_prod_at',
        'is_from_rc',
        'is_backuped',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'status' => DatabaseDumpStatus::class,
        'restored_rc_at' => 'immutable_datetime',
        'restored_prod_at' => 'immutable_datetime',
    ];

    public function getNewDumpName(): string
    {
        return str_replace('_', '-', DatabaseDumpHelper::getDatabaseName(isRc: $this->is_from_rc))
            . '_' . $this->created_at->format(self::NAME_DATETIME_FORMAT);
    }

    public static function fullPath(string $name): ?string
    {
        /** @noinspection PhpVoidFunctionResultUsedInspection */
        $subDir = Str::match('/_(\d{4}-\d{2})-/', $name) ?: FatalExceptionFactory::unexpected()->throw();
        return DatabaseDumpHelper::getDatabaseDumpsPath() . "/$subDir/$name.zip";
    }

    public static function innerFileName(string $name): ?string
    {
        return "$name.sql";
    }
}
