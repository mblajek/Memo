<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;
use Locale;

class SystemController
{
    public function translationList(?string $locale): JsonResponse
    {
        $locale = Locale::canonicalize($locale);
        $locale = in_array($locale, config('app.available_locales'), strict: true) ? $locale : App::getLocale();
        $basePath = '../resources/lang';
        $index = 'index.json';
        $readFile = fn(string $name): array => json_decode(file_get_contents("$basePath/$locale/$name"), true);
        $result = array_merge(["" => $locale], $readFile($index));
        foreach (scandir("$basePath/$locale") as $file) {
            if ($file !== $index && !str_starts_with($file, '.')) {
                $result[pathinfo($file, PATHINFO_FILENAME)] = $readFile($file);
            }
        }
        return new JsonResponse($result);
    }
}
