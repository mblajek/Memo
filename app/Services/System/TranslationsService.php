<?php

namespace App\Services\System;

use App\Exceptions\FatalExceptionFactory;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Locale;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

class TranslationsService
{
    public static function defaultLocale(): string
    {
        return App::getLocale();
    }

    private static function readYamlFile(string $locale, string $name): array
    {
        try {
            $path = "lang/$locale/$name";
            return Yaml::parseFile(App::resourcePath($path));
        } catch (ParseException $e) {
            Log::error("Cannot parse translations file '{$path}': {$e->getMessage()}");
            throw FatalExceptionFactory::translations();
        }
    }

    public static function defaultAppValidationTranslation(): array
    {
        return self::readYamlFile(self::defaultLocale(), 'validation.yml');
    }

    public static function mailTranslation(string $key): string
    {
        $value = Arr::get(self::readYamlFile(self::defaultLocale(), 'mails.yml'), $key, $key);
        return is_string($value) ? $value : $key;
    }

    public function translationList(string $locale): array
    {
        $locale = Locale::canonicalize($locale);
        $locale = in_array($locale, config('app.available_locales'), strict: true) ? $locale : self::defaultLocale();
        $index = 'index.yml';
        $readFile = fn(string $name): array => self::readYamlFile($locale, $name);
        $result = array_merge(["" => $locale], $readFile($index));
        foreach (scandir(App::resourcePath("lang/$locale")) as $file) {
            if ($file !== $index && !str_starts_with($file, '.')) {
                $result[pathinfo($file, PATHINFO_FILENAME)] = $readFile($file);
            }
        }
        return $result;
    }
}
