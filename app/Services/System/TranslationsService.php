<?php

namespace App\Services\System;

use App\Exceptions\FatalExceptionFactory;
use Illuminate\Support\Facades\App;
use Locale;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

class TranslationsService
{
    public static function defaultLocale(): string
    {
        return App::getLocale();
    }

    private static function readJsonFile(string $locale, string $name): array
    {
        try {
            return Yaml::parseFile(App::resourcePath('lang') . "/$locale/$name");
        } catch (ParseException $e) {
            echo $e->getMessage();
            throw FatalExceptionFactory::translations();
        }
    }

    public static function defaultAppValidationTranslation(): array
    {
        return self::readJsonFile(self::defaultLocale(), 'validation.yml');
    }

    public static function mailTranslation(string $key): string
    {
        $currentTree = self::readJsonFile(self::defaultLocale(), 'mails.yml');
        foreach (explode('.', $key) as $part) {
            if (!is_array($currentTree) || !array_key_exists($key, $currentTree)) {
                return $key;
            }
            $currentTree = $currentTree[$part];
        }
        return is_string($currentTree) ? $currentTree : $key;
    }

    public function translationList(string $locale): array
    {
        $locale = Locale::canonicalize($locale);
        $locale = in_array($locale, config('app.available_locales'), strict: true) ? $locale : self::defaultLocale();
        $index = 'index.yml';
        $readFile = fn(string $name): array => self::readJsonFile($locale, $name);
        $result = array_merge(["" => $locale], $readFile($index));
        foreach (scandir(App::resourcePath('lang') . "/$locale") as $file) {
            if ($file !== $index && !str_starts_with($file, '.')) {
                $result[pathinfo($file, PATHINFO_FILENAME)] = $readFile($file);
            }
        }
        return $result;
    }
}
