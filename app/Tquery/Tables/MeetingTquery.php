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
use App\Tquery\Engine\Bind\TqSingleBind;
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
            query: fn(TqSingleBind $bind) => "`meetings`.`facility_id` = {$bind->use()}",
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
        $config = new TqConfig(table: TqTableAliasEnum::meetings);

        $config->addSimple(TqDataTypeEnum::uuid, 'id');
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'from_meeting_id');
        $config->addSimple(TqDataTypeEnum::is_not_null, 'from_meeting_id', 'is_clone');
        $config->addSimple(TqDataTypeEnum::string_nullable, 'interval');
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
                    ? " and `meeting_attendants`.`attendance_type_dict_id` = '{$attendanceType->value}'" : '');
            $config->addQuery(
                TqDataTypeEnum::int,
                fn(string $tableName) => //
                "select count(1) from `meeting_attendants` $attendantWhere",
                "$attendanceName.count",
            );
            $config->addUuidListQuery(
                TqDataTypeEnum::uuid_list,
                '`meeting_attendants`.`user_id`',
                "`meeting_attendants` $attendantWhere",
                "$attendanceName.*.user_id",
            );
            $config->addQuery(
                TqDataTypeEnum::list,
                fn(string $tableName) => //
                    "select json_arrayagg(`users`.`name`) from `meeting_attendants`"
                    . " inner join `users` on `users`.`id` = `meeting_attendants`.`user_id` $attendantWhere",
                "$attendanceName.*.name",
            );
            $config->addUuidListQuery(
                new TqDictDef(TqDataTypeEnum::dict_list, DictionaryUuidEnum::AttendanceStatus),
                '`meeting_attendants`.`attendance_status_dict_id`',
                "`meeting_attendants` $attendantWhere",
                "$attendanceName.*.attendance_status_dict_id",
            );
            $config->addQuery(
                TqDataTypeEnum::list,
                fn(string $tableName) => //
                    "select json_arrayagg(json_object('userId', `users`.`id`, 'name', `users`.`name`,"
                    . "'attendanceTypeDictId', `meeting_attendants`.`attendance_type_dict_id`,"
                    . "'attendanceStatusDictId', `meeting_attendants`.`attendance_status_dict_id`"
                    . ")) from `meeting_attendants`"
                    . " inner join `users` on `users`.`id` = `meeting_attendants`.`user_id` $attendantWhere",
                $attendanceName,
            );
        }

        $resourceFromWhere = '`meeting_resources` where `meeting_resources`.`meeting_id` = `meetings`.`id`';
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1) from $resourceFromWhere",
            'resources.count',
        );
        $config->addUuidListQuery(
            new TqDictDef(TqDataTypeEnum::dict_list, DictionaryUuidEnum::MeetingResource),
            '`meeting_resources`.`resource_dict_id`',
            $resourceFromWhere,
            'resources.*.dict_id',
        );
        $config->addQuery(
            TqDataTypeEnum::list,
            fn(string $tableName) => //
            "select json_arrayagg(json_object('resourceDictId', `meeting_resources`.`resource_dict_id`)) from $resourceFromWhere",
            'resources',
        );

        $config->addCount();
        return $config;
    }
}
