<?php

namespace App\Tquery\Tables;

use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\TqBuilder;
use App\Tquery\Engine\TqService;

readonly class MeetingTquery extends TqService
{
    public function __construct(private Facility $facility)
    {
        parent::__construct();
    }

    protected function getBuilder(): TqBuilder
    {
        $builder = parent::getBuilder();
        $builder->where(
            query: fn(string $bind) => "meetings.facility_id = $bind",
            or: false,
            value: $this->facility->id,
            inverse: false,
            nullable: false,
        );
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableEnum::meetings);

        $config->addSimple(TqDataTypeEnum::uuid, 'id');
        $config->addSimple(TqDataTypeEnum::date, 'date');
        $config->addSimple(TqDataTypeEnum::int, 'start_dayminute');
        $config->addSimple(TqDataTypeEnum::int, 'duration_minutes');
        $config->addSimple(TqDataTypeEnum::text_nullable, 'notes');
        $config->addSimple(TqDataTypeEnum::datetime, 'created_at');
        $config->addSimple(TqDataTypeEnum::datetime, 'updated_at');
        $config->addSimple(TqDataTypeEnum::uuid, 'created_by', 'created_by.id');
        $config->addJoined(
            TqDataTypeEnum::string,
            TqTableAliasEnum::created_by,
            'name',
            'created_by.name',
        );
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1) from `meeting_attendants` where `meeting_attendants`.`meeting_id` = `meetings`.`id`",
            'attendants_count',
        );
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
                "select count(1) from `meeting_attendants` where `meeting_attendants`.`meeting_id` = `meetings`.`id`"
                . " and `meeting_attendants`.`attendance_type` = '" . AttendanceType::Staff->value . "'",
            'staff_count',
        );
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
                "select count(1) from `meeting_attendants` where `meeting_attendants`.`meeting_id` = `meetings`.`id`"
                . " and `meeting_attendants`.`attendance_type` = '" . AttendanceType::Client->value . "'",
            'clients_count',
        );
        $config->addCount();
        return $config;
    }
}
