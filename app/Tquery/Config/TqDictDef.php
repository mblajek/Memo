<?php

namespace App\Tquery\Config;

use App\Exceptions\FatalExceptionFactory;
use App\Models\UuidEnum\DictionaryUuidEnum;

readonly class TqDictDef
{
    public string $dictionaryId;

    public function __construct(
        public TqDataTypeEnum $dataType,
        string|DictionaryUuidEnum $dictionary,
    ) {
        if (!$this->dataType->isDict()) {
            FatalExceptionFactory::tquery()->throw();
        }
        $this->dictionaryId = is_string($dictionary) ? $dictionary : $dictionary->value;
    }
}
