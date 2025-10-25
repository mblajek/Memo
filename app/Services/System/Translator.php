<?php

namespace App\Services\System;

use Illuminate\Support\Arr;

class Translator implements \Illuminate\Contracts\Translation\Translator
{
    private string $locale;
    private array $translationLists = [];

    public function __construct(
        private readonly TranslationsService $service,
    ) {
        $this->locale = TranslationsService::defaultLocale();
    }

    public function get($key, array $replace = [], $locale = null)
    {
        $locale ??= $this->locale;
        $this->translationLists[$locale] ??= $this->service->translationList($locale);
        $line = Arr::get($this->translationLists[$locale], $key, default: $key);
        foreach ($replace as $replaceKey => $replaceValue) {
            $line = str_replace("{{{$replaceKey}}}", $replaceValue, $line);
        }
        return $line;
    }

    public function choice($key, $number, array $replace = [], $locale = null)
    {
        return $this->get($key, $replace, $locale);
    }

    public function getLocale(): string
    {
        return TranslationsService::defaultLocale();
    }

    public function setLocale($locale): void
    {
        $this->locale = $locale;
    }
}
