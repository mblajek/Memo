<?php

namespace App\Utils;

use App\Models\User;
use App\Utils\Date\DateHelper;
use DateTimeImmutable;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

class Texts
{
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
            DB::table('texts')->insert(
                ['id' => $id, 'created_at' => $nowString, 'updated_at' => $nowString, 'text' => $text]
            );
        }
        return $id;
    }

    public static function getText(?string $id): ?string
    {
        if (($id ?? '') === '') {
            return null;
        }
        return DB::table('texts')->where('id', $id)->firstOrFail('text')->text;
    }
}
