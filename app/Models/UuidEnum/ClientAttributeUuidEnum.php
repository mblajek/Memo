<?php

namespace App\Models\UuidEnum;

enum ClientAttributeUuidEnum: string implements AttributeUuidEnum
{
    use AttributeUuidEnumTrait;

    case ShortCode = 'f28a6833-2369-4b41-a005-23aee3c31b22';
    case Type = 'b9685bc6-ab47-42bd-99e8-68badf0c1291';
    case Gender = '0e56d086-5bf7-46c0-8359-38e9edf8c627';
    case Notes = 'a8f3fc00-cda2-4ce0-8bd4-12c223944191';
    case BirthDate = '7a678df3-c9b1-4133-9520-d388c823a186';
    case ContactEmail = '50e76d71-bcad-473f-983b-3e9f5e00d6f7';
    case ContactPhone = '9722feb5-f804-4ac9-8d8d-6ebc319da50d';
    case AddressStreetNumber = 'fd077aac-4341-480c-a27a-0695ad152339';
    case AddressPostalCode = 'dc0fca68-93e6-4d82-af31-36d00fd9ae83';
    case AddressCity = 'd90522a3-960b-4217-af88-b636fcd3d349';
    case ContactStartAt = 'a783d287-26de-4566-9314-64d3eb285037';
    case ContactEndAt = 'c2f0dda4-68b3-481b-aa25-62595caa40fd';
    case DocumentsLinks = 'e1c14100-070d-4213-8927-6b7aed9617a4';
    case NotificationMethods = 'c0742816-fb80-46de-b7d9-374e4057a2e3';
}
