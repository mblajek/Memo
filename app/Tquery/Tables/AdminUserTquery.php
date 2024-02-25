<?php

namespace App\Tquery\Tables;

use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;

readonly class AdminUserTquery extends TqService
{
    public function __construct(protected Facility $facility)
    {
        parent::__construct();
    }

    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::users);
        $config->addSimple(TqDataTypeEnum::uuid, 'id');
        $config->addSimple(TqDataTypeEnum::string, 'name');
        $config->addSimple(TqDataTypeEnum::string_nullable, 'email');
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'last_login_facility_id', 'last_login_facility.id');
        $config->addJoined(
            TqDataTypeEnum::string_nullable,
            TqTableAliasEnum::last_login_facility,
            'name',
            'last_login_facility.name',
        );
        $config->addSimple(TqDataTypeEnum::is_not_null, 'password', 'has_password');
        $config->addSimple(TqDataTypeEnum::datetime_nullable, 'password_expire_at');
        $config->addSimple(TqDataTypeEnum::datetime, 'created_at');
        $config->addSimple(TqDataTypeEnum::datetime, 'updated_at');
        $config->addSimple(TqDataTypeEnum::is_not_null, 'email_verified_at', 'has_email_verified');
        $config->addSimple(TqDataTypeEnum::uuid, 'created_by', 'created_by.id');
        $config->addJoined(
            TqDataTypeEnum::string,
            TqTableAliasEnum::created_by,
            'name',
            'created_by.name',
        );
        $config->addSimple(TqDataTypeEnum::is_not_null, 'global_admin_grant_id', 'has_global_admin');
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1) from `members` where `members`.`user_id` = `users`.`id`",
            'facilities.count',
        );
        $config->addCount();
        return $config;
    }

    protected function addMeetingsRelatedColumns(TqConfig $config): void
    {
        $c = fn($x) => '"' . $x . '"';

        $config->addQuery(
            TqDataTypeEnum::date_nullable,
            fn(string $tableName) => //
            "select min(`meetings`.`date`)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in
                    ({$c(MeetingAttendant::ATTENDANCE_STATUS_OK)},
                     {$c(MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT)})
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_COMPLETED)}
                and `meetings`.`deleted_at` is null",
            "first_meeting_date"
        );

        $config->addQuery(
            TqDataTypeEnum::date_nullable,
            fn(string $tableName) => //
            "select max(`meetings`.`date`)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in
                    ({$c(MeetingAttendant::ATTENDANCE_STATUS_OK)},
                     {$c(MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT)})
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_COMPLETED)}
                and `meetings`.`deleted_at` is null",
            "last_meeting_date"
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in
                    ({$c(MeetingAttendant::ATTENDANCE_STATUS_OK)},
                     {$c(MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT)})
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_COMPLETED)}
                and `meetings`.`deleted_at` is null",
            "completed_meetings_count"
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in
                    ({$c(MeetingAttendant::ATTENDANCE_STATUS_OK)},
                     {$c(MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT)})
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_COMPLETED)}
                and `meetings`.`deleted_at` is null
                /* Last month */
                and date > date_sub(curdate(), interval 1 month)
                and date <= curdate()",
            "completed_meetings_count_last_month"
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in
                    ({$c(MeetingAttendant::ATTENDANCE_STATUS_OK)},
                     {$c(MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT)})
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_PLANNED)}
                and `meetings`.`deleted_at` is null",
            "planned_meetings_count"
        );
    }
}
