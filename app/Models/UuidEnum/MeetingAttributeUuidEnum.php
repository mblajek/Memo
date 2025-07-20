<?php

namespace App\Models\UuidEnum;

enum MeetingAttributeUuidEnum: string implements AttributeUuidEnum
{
    use AttributeUuidEnumTrait;

    case Type = '5f7d5e66-03f9-4bcd-a726-fde82cf98d6f';
    case Category = '8111626d-130c-454d-b0c0-9fda9ab9917a';
    case Status = 'e443e2c2-82fc-41d3-8fda-fe374e5329d3';
}
