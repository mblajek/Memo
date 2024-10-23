<?php

namespace App\Utils;

use App\Models\User;
use App\Utils\Date\DateHelper;
use DateTimeImmutable;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

class Texts
{
    // private const int SHORT_LENGTH = 16320;
    private const int SHORT_LENGTH = 16351;

    public static function getId(?string $text): ?string
    {
        if (($text ?? '') === '') {
            return null;
        }
        $id = Uuid::uuid5(User::SYSTEM, $text)->toString();
        $nowString = DateHelper::toDbString(new DateTimeImmutable());
        if (
            DB::table('texts')->where('id', $id)->update(['updated_at' => $nowString]) === 0
            && DB::table('texts')->where('id', $id)->doesntExist() // identical date updates 0 rows
        ) {
            $long_text = null;
            $length = mb_strlen($text);
            if ($length > self::SHORT_LENGTH) {
                $long_text = '-' . mb_substr($text, self::SHORT_LENGTH - 1);
                $text = mb_substr($text, 0, self::SHORT_LENGTH - 1) . '-';
            }
            DB::table('texts')->insert([
                'id' => $id,
                'created_at' => $nowString,
                'updated_at' => $nowString,
                'length' => $length,
                'short_text' => $text,
                'long_text' => $long_text,
            ]);
        }
        return $id;
    }

    public static function getText(?string $id): ?string
    {
        if (($id ?? '') === '') {
            return null;
        }
        $texts = DB::table('texts')->where('id', $id)->firstOrFail(['short_text', 'long_text']);
        $shortTest = $texts->short_text;
        $longTest = $texts->long_text;
        return ($longTest === null)
            ? $shortTest : substr($shortTest, 0, self::SHORT_LENGTH) . substr($longTest, 1);
    }
}
