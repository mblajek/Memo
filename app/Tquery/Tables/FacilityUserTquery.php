<?php

namespace App\Tquery\Tables;

use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;

abstract readonly class FacilityUserTquery extends AdminUserTquery
{
    public function __construct(protected Facility $facility)
    {
        parent::__construct();
    }

    protected function getConfig(): TqConfig
    {
        $c = fn(string $x) => "'$x'";

        $present = "({$c(MeetingAttendant::ATTENDANCE_STATUS_OK)},
                     {$c(MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT)})";

        $config = parent::getConfig();

        $config->addQuery(
            TqDataTypeEnum::date_nullable,
            fn(string $tableName) => //
            "select min(`meetings`.`date`)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in $present
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_COMPLETED)}
                and `meetings`.`category_dict_id` != {$c(Meeting::CATEGORY_SYSTEM)}
                and `meetings`.`deleted_at` is null",
            'first_meeting_date'
        );

        $config->addQuery(
            TqDataTypeEnum::date_nullable,
            fn(string $tableName) => //
            "select max(`meetings`.`date`)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in $present
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_COMPLETED)}
                and `meetings`.`category_dict_id` != {$c(Meeting::CATEGORY_SYSTEM)}
                and `meetings`.`deleted_at` is null",
            'last_meeting_date'
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in $present
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_COMPLETED)}
                and `meetings`.`category_dict_id` != {$c(Meeting::CATEGORY_SYSTEM)}
                and `meetings`.`deleted_at` is null",
            'completed_meetings_count'
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in $present
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_COMPLETED)}
                and `meetings`.`category_dict_id` != {$c(Meeting::CATEGORY_SYSTEM)}
                and `meetings`.`deleted_at` is null
                /* Last month */
                and date > date_sub(curdate(), interval 1 month)
                and date <= curdate()",
            'completed_meetings_count_last_month'
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in $present
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_PLANNED)}
                and `meetings`.`category_dict_id` != {$c(Meeting::CATEGORY_SYSTEM)}
                and `meetings`.`deleted_at` is null",
            'planned_meetings_count'
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in $present
                and `meetings`.`status_dict_id` = {$c(Meeting::STATUS_PLANNED)}
                and `meetings`.`category_dict_id` != {$c(Meeting::CATEGORY_SYSTEM)}
                and `meetings`.`deleted_at` is null
                /* Next month */
                and date > curdate()
                and date <= date_add(curdate(), interval 1 month)",
            'planned_meetings_count_next_month'
        );

        return $config;
    }
}
