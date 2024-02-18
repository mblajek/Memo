<?php

namespace App\Tquery\Tables;

use App\Models\Facility;
use App\Models\Meeting;
use App\Models\MeetingAttendant;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;
use Illuminate\Support\Facades\App;

readonly class ClientTquery extends AdminUserTquery
{
    public function __construct(private Facility $facility)
    {
        parent::__construct();
    }

    protected function getBuilder(): TqBuilder
    {
        $builder = TqBuilder::fromTable(TqTableEnum::users);
        $builder->join(TqTableEnum::users, TqTableAliasEnum::members, 'user_id', left: false, inv: true);
        $builder->where(fn(TqSingleBind $bind) => //
        "members.facility_id = {$bind->use()}", false, $this->facility->id, false, false);
        $builder->where(fn(null $bind) => 'members.client_id is not null', false, null, false, false);
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig();

        $config->addQuery(
            TqDataTypeEnum::date_nullable,
            fn(string $tableName) => //
            "select max(`meetings`.`date`)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in
                    ({MeetingAttendant::ATTENDANCE_STATUS_OK}, {MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT})
                and `meetings`.`status_dict_id` = {Meeting::STATUS_COMPLETED}",
            "last_meeting_date"
        );

        $config->addQuery(
            TqDataTypeEnum::date_nullable,
            fn(string $tableName) => //
            "select min(`meetings`.`date`)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = '{$this->facility->id}'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in
                    ({MeetingAttendant::ATTENDANCE_STATUS_OK}, {MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT})
                and `meetings`.`status_dict_id` = {Meeting::STATUS_COMPLETED}",
            "first_meeting_date"
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
                    ({MeetingAttendant::ATTENDANCE_STATUS_OK}, {MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT})
                and `meetings`.`status_dict_id` = {Meeting::STATUS_COMPLETED}",
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
                    ({MeetingAttendant::ATTENDANCE_STATUS_OK}, {MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT})

                and `meetings`.`status_dict_id` = {Meeting::STATUS_COMPLETED}
                /* Last month */
                and year(date) = year(date_sub(curdate(), interval 1 month))
                and month(date) = month(date_sub(curdate(), interval 1 month))",
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
                    ({MeetingAttendant::ATTENDANCE_STATUS_OK}, {MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT})
                and `meetings`.`date` >= CURDATE()
                and `meetings`.`status_dict_id` = {Meeting::STATUS_PLANNED}",
            "planned_meetings_count"
        );

        return $config;
    }
}
