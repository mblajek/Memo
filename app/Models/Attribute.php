<?php

namespace App\Models;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Enums\AttributeRequirementLevel;
use App\Models\Enums\AttributeTable;
use App\Models\Enums\AttributeType;
use App\Models\QueryBuilders\AttributeBuilder;
use App\Models\Traits\BaseModel;
use App\Models\Traits\HasValidator;
use App\Models\UuidEnum\AttributeUuidEnum;
use App\Rules\Valid;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqDictDef;
use BackedEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * @property ?string facility_id
 * @property AttributeTable table
 * @property string name
 * @property string api_name
 * @property AttributeType type
 * @property ?string dictionary_id
 * @property int default_order
 * @property ?bool is_multi_value
 * @property bool is_fixed
 * @property AttributeRequirementLevel requirement_level
 * @property string notes
 * @method static AttributeBuilder query()
 */
class Attribute extends Model
{
    use BaseModel;
    use HasValidator;

    protected $table = 'attributes';

    protected $fillable = [
        'facility_id',
        'table',
        'name',
        'api_name',
        'type',
        'dictionary_id',
        'default_order',
        'is_multi_value',
        'is_fixed',
        'requirement_level',
        'notes',
    ];

    protected $casts = [
        'created_at' => 'immutable_datetime',
        'updated_at' => 'immutable_datetime',
        'table' => AttributeTable::class,
        'type' => AttributeType::class,
        'is_multi_value' => 'boolean',
        'is_fixed' => 'boolean',
        'requirement_level' => AttributeRequirementLevel::class,
    ];

    protected static function fieldValidator(string $field): string|array
    {
        return match ($field) {
            'facility_id' => Valid::uuid([Rule::exists('facilities', 'id')], nullable: true),
            'model' => Valid::trimmed(
                [Rule::in(array_map(fn(AttributeTable $table) => lcfirst($table->name), AttributeTable::cases()))]
            ),
            'name' => Valid::trimmed(),
            'api_name' => Valid::trimmed(['regex:/^[a-z][A-Za-z0-9]+$/']),
            'type' => Valid::trimmed([Rule::enum(AttributeType::class)]),
            //todo: dictionary exists in facility; required (only) for type "dict"
            'dictionary_id' => Valid::uuid([Rule::exists('dictionaries', 'id')], nullable: true),
            'default_order' => Valid::int(['min:1'], sometimes: true),
            'is_multi_value', 'is_fixed' => Valid::bool(nullable: true),
            'requirement_level' => Valid::trimmed([Rule::enum(AttributeRequirementLevel::class)]),
            'notes' => Valid::text(nullable: true),
        };
    }

    private static ?array $all = null;

    public function getTqueryDataType(): TqDataTypeEnum|TqDictDef
    {
        return $this->type->getTqueryDataType(
            nullable: $this->requirement_level->isNullable(),
            multi: $this->is_multi_value ?? false,
            dictionaryId: $this->dictionary_id,
        );
    }

    public static function getAll(): array
    {
        if (self::$all === null) {
            self::$all = self::query()->orderBy('default_order')->get()->keyBy('id')->all();
        }
        return self::$all;
    }

    /** @return array<non-falsy-string, self> */
    public static function getBy(
        null|Facility|string|true $facility = null,
        null|AttributeTable $table = null,
    ): array {
        $facility = ($facility === true) ? PermissionMiddleware::permissions()->facility : $facility;
        $facilityId = ($facility instanceof Facility) ? $facility->id : $facility;
        return array_filter(self::getAll(), fn(self $attribute) => //
            ($facilityId === null || $attribute->facility_id === null || $attribute->facility_id === $facilityId)
            && ($table === null || $attribute->getAttributeValue('table') === $table));
    }

    public static function getById((AttributeUuidEnum&BackedEnum)|string $id): self
    {
        return Attribute::getAll()[is_string($id) ? $id : $id->value];
    }

    public function getSingleValidator(): string|array
    {
        $nullable = $this->requirement_level->isNullable();
        $notMultiValue = ($this->is_multi_value !== true); // each of multi values is not null
        return $this->type->getSingleValidator($nullable && $notMultiValue, $this->dictionary_id);
    }

    public function getMultiValidator(): string|array
    {
        $nullable = $this->requirement_level->isNullable();
        return Valid::list(sometimes: $nullable, nullable: $nullable, min: $nullable ? 0 : 1);
    }
}
