<?php

namespace App\Models;

use App\Models\QueryBuilders\GroupClientBuilder;
use App\Models\Traits\BaseModel;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $client_group_id
 * @property string $user_id
 * @property string $role
 * @method static GroupClientBuilder query()
 */
class GroupClient extends Model
{
    use BaseModel;

    protected $table = 'group_clients';

    protected $fillable = [
        'client_group_id',
        'user_id',
        'role',
    ];

    protected $casts = self::BASE_CASTS;
}
