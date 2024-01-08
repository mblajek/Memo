<?php

namespace App\Tquery\Tables;

use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Models\UuidEnum\MeetingAttributeUuidEnum;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqDictDef;
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
            query: fn(string $bind) => "`meetings`.`facility_id` = $bind",
            or: false,
            value: $this->facility->id,
            inverse: false,
            nullable: false,
        );
        $builder->whereNotDeleted($this->config->table);
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
        $config->addSimple(TqDataTypeEnum::bool, 'is_remote');
        $config->addAttribute(MeetingAttributeUuidEnum::Category);
        $config->addAttribute(MeetingAttributeUuidEnum::Type);
        $config->addAttribute(MeetingAttributeUuidEnum::Status);
        $config->addSimple(TqDataTypeEnum::datetime, 'created_at');
        $config->addSimple(TqDataTypeEnum::datetime, 'updated_at');
        $config->addSimple(TqDataTypeEnum::uuid, 'created_by', 'created_by.id');
        $config->addJoined(
            TqDataTypeEnum::string,
            TqTableAliasEnum::created_by,
            'name',
            'created_by.name',
        );
        $config->addSimple(TqDataTypeEnum::uuid, 'updated_by', 'updated_by.id');
        $config->addJoined(
            TqDataTypeEnum::string,
            TqTableAliasEnum::updated_by,
            'name',
            'updated_by.name',
        );
        /** @var array<string, ?AttendanceType> $attendanceTypes */
        $attendanceTypes = [
            'attendants' => null,
            'clients' => AttendanceType::Client,
            'staff' => AttendanceType::Staff,
        ];
        foreach ($attendanceTypes as $attendanceName => $attendanceType) {
            $attendantWhere = 'where `meeting_attendants`.`meeting_id` = `meetings`.`id`' . ($attendanceType
                    ? " and `meeting_attendants`.`attendance_type` = '{$attendanceType->value}'" : '');
            $config->addQuery(
                TqDataTypeEnum::int,
                fn(string $tableName) => //
                "select count(1) from `meeting_attendants` $attendantWhere",
                "$attendanceName.count",
            );
            $config->addQuery(
                TqDataTypeEnum::uuid_list,
                fn(string $tableName) => //
                "select json_arrayagg(`meeting_attendants`.`user_id`) from `meeting_attendants` $attendantWhere",
                "$attendanceName.*.userId",
            );
            $config->addQuery(
                TqDataTypeEnum::list,
                fn(string $tableName) => //
                    // todo: remove replace after updating mariadb to 11.2.3
                    "select json_arrayagg(replace(replace(`users`.`name`,'ó','u'),'Ó','U')) from `meeting_attendants`"
                    . " inner join `users` on `users`.`id` = `meeting_attendants`.`user_id` $attendantWhere",
                "$attendanceName.*.name",
            );
            $config->addQuery(
                TqDataTypeEnum::list,
                fn(string $tableName) => //
                    "select json_arrayagg(`meeting_attendants`.`attendance_status_dict_id`)"
                    . " from `meeting_attendants` $attendantWhere",
                "$attendanceName.*.attendanceStatusDictId",
            );
            $config->addQuery(
                TqDataTypeEnum::list,
                fn(string $tableName) => //
                    "select json_arrayagg(json_object('userId', `users`.`id`, 'name', `users`.`name`,"
                    . "'attendanceStatusDictId', `meeting_attendants`.`attendance_status_dict_id`"
                    . ")) from `meeting_attendants`"
                    . " inner join `users` on `users`.`id` = `meeting_attendants`.`user_id` $attendantWhere",
                $attendanceName,
            );
        }

        $resourceFromWhere = 'from `meeting_resources` where `meeting_resources`.`meeting_id` = `meetings`.`id`';
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1) $resourceFromWhere",
            'resources.count',
        );
        $config->addQuery(
            new TqDictDef(TqDataTypeEnum::dict_list, DictionaryUuidEnum::MeetingResource),
            fn(string $tableName) => //
            "select json_arrayagg(`meeting_resources`.`resource_dict_id`) $resourceFromWhere",
            'resources.*.dict_id',
        );
        $config->addQuery(
            TqDataTypeEnum::list,
            fn(string $tableName) => //
                "select json_arrayagg(json_object('resourceDictId', `meeting_resources`.`resource_dict_id`"
                . ")) $resourceFromWhere",
            'resources',
        );

        $config->addCount();
        return $config;
    }
}
