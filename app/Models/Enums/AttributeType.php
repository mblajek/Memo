<?php

namespace App\Models\Enums;

use App\Exceptions\FatalExceptionFactory;
use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Rules\Valid;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqDictDef;
use Illuminate\Validation\Rule;

enum AttributeType: string
{
    // Standard data types
    case Bool = 'bool';
    case Date = 'date';
    case Datetime = 'datetime';
    case Int = 'int';
    case String = 'string'; // 255
    case Text = 'text'; // 4096
    // Supported table names
    case Users = 'users';
    case Clients = 'clients';
    case Attributes = 'attributes';
    // Dictionary
    case Dict = 'dict';
    // Other
    case Separator = 'separator';

    public function tryGetTable(): ?AttributeTable
    {
        return AttributeTable::tryFrom($this->value);
    }

    public function getTqueryDataType(
        bool $nullable,
        bool $multi,
        DictionaryUuidEnum|string|null $dictionaryId,
    ): TqDictDef|TqDataTypeEnum {
        $type = $multi ? match ($this) {
            self::Bool, self::Date, self::Datetime, self::Int, self::Text => TqDataTypeEnum::list,
            self::Users, self::Clients, self::Attributes => TqDataTypeEnum::uuid_list,
            self::String => TqDataTypeEnum::string_list,
            self::Dict => TqDataTypeEnum::dict_list,
            self::Separator => FatalExceptionFactory::unexpected()->throw(),
        } : match ($this) {
            self::Bool => $nullable ? TqDataTypeEnum::bool_nullable : TqDataTypeEnum::bool,
            self::Date => $nullable ? TqDataTypeEnum::date_nullable : TqDataTypeEnum::date,
            self::Datetime => $nullable ? TqDataTypeEnum::datetime_nullable : TqDataTypeEnum::datetime,
            self::Int => $nullable ? TqDataTypeEnum::int_nullable : TqDataTypeEnum::int,
            self::String => $nullable ? TqDataTypeEnum::string_nullable : TqDataTypeEnum::string,
            self::Users, self::Clients, self::Attributes => $nullable ?
                TqDataTypeEnum::uuid_nullable : TqDataTypeEnum::uuid,
            self::Dict => $nullable ? TqDataTypeEnum::dict_nullable : TqDataTypeEnum::dict,
            self::Text => $nullable ? TqDataTypeEnum::text_nullable : TqDataTypeEnum::text,
            self::Separator => FatalExceptionFactory::unexpected()->throw(),
        };
        return $type->isDict() ? (new TqDictDef($type, $dictionaryId)) : $type;
    }

    public function getSingleValidator(
        bool $nullable,
        DictionaryUuidEnum|string|null $dictionaryId,
    ): string|array {
        return match ($this) {
            self::Bool => Valid::bool(sometimes: $nullable, nullable: $nullable),
            self::Date => Valid::date(sometimes: $nullable, nullable: $nullable),
            self::Datetime => Valid::datetime(sometimes: $nullable, nullable: $nullable),
            self::Int => Valid::int(sometimes: $nullable, nullable: $nullable),
            self::String => Valid::trimmed(sometimes: $nullable, nullable: $nullable),
            self::Dict => Valid::dict($dictionaryId, sometimes: $nullable, nullable: $nullable),
            self::Text => Valid::text(sometimes: $nullable, nullable: $nullable),
            self::Separator => 'missing',
            default => Valid::uuid(
                [Rule::exists(AttributeTable::from($this->value)->value, 'id')], // assert this is table
                sometimes: $nullable,
                nullable: $nullable,
            ),
        };
    }
}
