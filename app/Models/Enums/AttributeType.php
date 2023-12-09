<?php

namespace App\Models\Enums;

use App\Tquery\Config\TqDataTypeEnum;

enum AttributeType: string
{
    // Standard data types.
    case Bool = 'bool';
    case Date = 'date';
    case Datetime = 'datetime';
    case Int = 'int';
    case String = 'string';
    // Supported table names.
    case Users = 'users';
    case Clients = 'clients';
    case Attributes = 'attributes';
    // Dictionary.
    case Dict = 'dict';

    public function tryGetTable(): ?AttributeTable
    {
        return AttributeTable::tryFrom($this->value);
    }

    public function getTqueryDataType(bool $nullable): TqDataTypeEnum
    {
        return match ($this) {
            self::Bool => $nullable ? TqDataTypeEnum::bool_nullable : TqDataTypeEnum::bool,
            self::Date => $nullable ? TqDataTypeEnum::date_nullable : TqDataTypeEnum::date,
            self::Datetime => $nullable ? TqDataTypeEnum::datetime_nullable : TqDataTypeEnum::datetime,
            self::Int => $nullable ? TqDataTypeEnum::int_nullable : TqDataTypeEnum::int,
            self::String => $nullable ? TqDataTypeEnum::string_nullable : TqDataTypeEnum::string,
            self::Users, self::Clients, self::Attributes => $nullable ?
                TqDataTypeEnum::uuid_nullable : TqDataTypeEnum::uuid,
            self::Dict => $nullable ? TqDataTypeEnum::dict_nullable : TqDataTypeEnum::dict,
        };
    }
}
