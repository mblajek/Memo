<?php

namespace App\Tquery\Tables;

use App\Models\Enums\AttendanceType;
use App\Models\Facility;
use App\Models\Meeting;
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
    public function __construct(protected Facility $facility)
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
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::meetings);
        $config->addBase();
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
        /** @var array<string, ?AttendanceType> $attendanceTypes */
        $attendanceTypes = [
            'attendants' => null,
            'clients' => AttendanceType::Client,
            'staff' => AttendanceType::Staff,
        ];

        $config->addQuery(
            TqDataTypeEnum::bool,
            fn(string $tableName) => "select not (exists(select 1 from `meeting_attendants`"
                . " where `meeting_attendants`.`meeting_id` = `$tableName`.`id`"
                . " and `meeting_attendants`.`attendance_type_dict_id` = '{$attendanceTypes['staff']->value}'"
                . ") or exists(select 1 from `meeting_resources`"
                . " where `meeting_resources`.`meeting_id` = `meetings`.`id`))",
            'isFacilityWide',
        );

        foreach ($attendanceTypes as $attendanceName => $attendanceType) {
            $attendantWhere = 'where `meeting_attendants`.`meeting_id` = `meetings`.`id`' . ($attendanceType
                    ? " and `meeting_attendants`.`attendance_type_dict_id` = '{$attendanceType->value}'" : '');
            $config->addQuery(
                TqDataTypeEnum::int,
                fn(string $tableName) => //
                "select count(1) from `meeting_attendants` $attendantWhere",
                "$attendanceName.count",
            );
            $config->addListQuery(
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
            $config->addListQuery(
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
        $config->addListQuery(
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

        /** @noinspection SqlResolve */
        $seriesSql = 'select nullif(count(1), 0) from `meetings` as `other`'
            . ' where `other`.`from_meeting_id` = `meetings`.from_meeting_id';
        $config->addQuery(
            TqDataTypeEnum::int_nullable,
            fn(string $tableName) => $seriesSql,
            'series_count',
        );
        $config->addQuery(
            TqDataTypeEnum::int_nullable,
            fn(string $tableName) => $seriesSql
                . ' and (`other`.`date` < `meetings`.`date`'
                . ' or (`other`.`date` = `meetings`.`date`'
                . ' and (`other`.`start_dayminute` < `meetings`.`start_dayminute`'
                . ' or (`other`.`start_dayminute` = `meetings`.`start_dayminute`'
                . ' and `other`.`id` <= `meetings`.`id`))))',
            'series_number',
        );

        $this->addConflictColumns($config);

        $config->addCount();
        return $config;
    }

    private function addConflictColumns(TqConfig $config): void
    {
        $date = (new \DateTimeImmutable('-2day'))
            ->setTimezone(new \DateTimeZone('Europe/Warsaw'))
            ->format('Y-m-d');
        $statusCancelled = Meeting::STATUS_CANCELLED;
        $categorySystem = Meeting::CATEGORY_SYSTEM;

        $fromSql = '`meeting_resources` inner join `meeting_resources` as `other_meeting_resources`'
            . ' on `other_meeting_resources`.`resource_dict_id` = `meeting_resources`.`resource_dict_id`'
            . ' inner join `meetings` as `other_meetings`'
            . ' on `other_meetings`.`id` = `other_meeting_resources`.`meeting_id`'
            . ' where `meeting_resources`.`meeting_id` = `meetings`.`id` and `meetings`.`id` != `other_meetings`.`id`'
            . " and `other_meetings`.`facility_id` = '{$this->facility->id}'"
            . " and '$statusCancelled' not in (`meetings`.`status_dict_id`, `other_meetings`.`status_dict_id`)"
            . " and '$categorySystem' not in (`meetings`.`category_dict_id`, `other_meetings`.`category_dict_id`)"
            . " and `meetings`.`date` > '$date' and `other_meetings`.`date` >= '$date'" // other from 2 days
            . ' and `other_meetings`.`date` between' // redundant operation, but may optimize query
            . ' (`meetings`.`date` - interval 1 day) and (`meetings`.`date` + interval 1 day)'
            . " and datediff(`meetings`.`date`, '$date') * 1440 + `meetings`.`start_dayminute`"
            . " < datediff(`other_meetings`.`date`, '$date') * 1440" // minutes in day
            . " + `other_meetings`.`start_dayminute` + `other_meetings`.`duration_minutes`"
            . " and datediff(`other_meetings`.`date`, '$date') * 1440 + `other_meetings`.`start_dayminute`"
            . " < datediff(`meetings`.`date`, '$date') * 1440" // minutes in day
            . " + `meetings`.`start_dayminute` + `meetings`.`duration_minutes`";

        $config->addListQuery(
            type: TqDataTypeEnum::uuid_list,
            select: '`other_meetings`.`id`',
            from: $fromSql,
            columnAlias: 'resource_conflicts.*.meeting_id',
            selectDistinct: true,
        );

        $config->addListQuery(
            type: new TqDictDef(TqDataTypeEnum::dict_list, DictionaryUuidEnum::MeetingResource),
            select: '`meeting_resources`.`resource_dict_id`',
            from: $fromSql,
            columnAlias: 'resource_conflicts.*.resource_dict_id',
            selectDistinct: true,
        );

        $config->addQuery(
            type: TqDataTypeEnum::bool_nullable,
            columnOrQuery: fn(string $tableName) => //
            "select IF(`meetings`.`date` > '$date', exists (select 1 from $fromSql), null)",
            columnAlias: 'resource_conflicts.exists',

        );
    }
}
