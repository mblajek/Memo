<?php

namespace App\Services\System;

use App\Exceptions\ConfigExceptionFactory;
use Illuminate\Support\Facades\App;
use JsonException;
use Locale;

class TranslationsService
{
    public function translationList(string $locale): array
    {
        $locale = Locale::canonicalize($locale);
        $locale = in_array($locale, config('app.available_locales'), strict: true) ? $locale : App::getLocale();
        $basePath = '../resources/lang';
        $index = 'index.json';
        try {
            $readFile = fn(string $name): array => json_decode(
                file_get_contents("$basePath/$locale/$name"),
                associative: true,
                flags: JSON_THROW_ON_ERROR,
            );
            $result = array_merge(["" => $locale], $readFile($index));
            foreach (scandir("$basePath/$locale") as $file) {
                if ($file !== $index && !str_starts_with($file, '.')) {
                    $result[pathinfo($file, PATHINFO_FILENAME)] = $readFile($file);
                }
            }
        } catch (JsonException) {
            throw ConfigExceptionFactory::translations();
        }
        return $result;
    }
}
