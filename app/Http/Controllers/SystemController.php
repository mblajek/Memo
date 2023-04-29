<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;
use JsonException;
use Locale;
use OpenApi\Annotations\OpenApi as OA;

/** System endpoints without authorisation */
class SystemController extends ApiController
{
    /**
     * @OA\Get(
     *     path="/api/v1/system/translation/{lang}/list",
     *     tags={"System"},
     *     summary = "All translations",
     *     @OA\Parameter(name="lang", in="path", required=true, example="pl-pl", @OA\Schema(type="string")),
     *     @OA\Response(response="200", description="Translations JSON")
     * )
     * @throws JsonException
     */
    public function translationList(?string $locale): JsonResponse
    {
        $locale = Locale::canonicalize($locale);
        $locale = in_array($locale, config('app.available_locales'), strict: true) ? $locale : App::getLocale();
        $basePath = '../resources/lang';
        $index = 'index.json';
        $readFile = fn(string $name): array => json_decode(
            file_get_contents("$basePath/$locale/$name"),
            associative: true,
            flags: JSON_THROW_ON_ERROR
        );
        $result = array_merge(["" => $locale], $readFile($index));
        foreach (scandir("$basePath/$locale") as $file) {
            if ($file !== $index && !str_starts_with($file, '.')) {
                $result[pathinfo($file, PATHINFO_FILENAME)] = $readFile($file);
            }
        }
        return new JsonResponse($result);
    }
}
