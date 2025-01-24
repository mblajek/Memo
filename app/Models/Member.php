<?php

namespace App\Models;

use App\Models\QueryBuilders\MemberBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Rules\Valid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $user_id
 * @property string $facility_id
 * @property ?string $staff_member_id
 * @property ?string $client_id
 * @property ?string $facility_admin_grant_id
 * @property-read Facility $facility
 * @property-read User $user
 * @property-read ?StaffMember staffMember
 * @property-read ?Client $client
 * @method static MemberBuilder query()
 */
class Member extends Model
{
    use BaseModel;
    use HasValidator;

    protected $table = 'members';

    protected $fillable = [
        'user_id',
        'facility_id',
        'staff_member_id',
        'client_id',
        'facility_admin_grant_id',
    ];

    protected $casts = self::BASE_CASTS;

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'facility_id' => Valid::uuid(['exists:facilities,id']),
            'has_facility_admin', 'is_facility_client', 'is_active_facility_staff' => Valid::bool(),
            'is_facility_staff' => Valid::bool(['accepted_if:is_active_facility_staff,true']),
        };
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    public function isActiveStaff(): ?bool
    {
        return $this->staffMember?->isActive();
    }
}
