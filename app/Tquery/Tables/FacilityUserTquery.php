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

    final public static function addAttendantFields(Facility $facility, TqConfig $config): void
    {
        $c = fn(string $x) => "'$x'";

        $present = "({$c(MeetingAttendant::ATTENDANCE_STATUS_OK)},
                     {$c(MeetingAttendant::ATTENDANCE_STATUS_LATE_PRESENT)})";

        $commonQueryPart = <<<"SQL"
            from `meetings`
            inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
            where `meetings`.`facility_id` = '{$facility->id}'
            and `meeting_attendants`.`user_id` = `users`.`id`
            and `meeting_attendants`.`attendance_status_dict_id` in $present
            and `meetings`.`category_dict_id` != {$c(Meeting::CATEGORY_SYSTEM)}
            SQL;

        $andMeetingStatusIs = fn(string $meetingStatusDictId
        ) => "and `meetings`.`status_dict_id` = '$meetingStatusDictId'";

        $config->addQuery(
            TqDataTypeEnum::date_nullable,
            fn(string $tableName) => <<<"SQL"
            select min(`meetings`.`date`)
            {$commonQueryPart}
            {$andMeetingStatusIs(Meeting::STATUS_COMPLETED)}
            SQL,
            'first_meeting_date'
        );

        $config->addQuery(
            TqDataTypeEnum::date_nullable,
            fn(string $tableName) => <<<"SQL"
            select max(`meetings`.`date`)
            {$commonQueryPart}
            {$andMeetingStatusIs(Meeting::STATUS_COMPLETED)}
            SQL,
            'last_meeting_date'
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => <<<"SQL"
            select count(1)
            {$commonQueryPart}
            {$andMeetingStatusIs(Meeting::STATUS_COMPLETED)}
            SQL,
            'completed_meetings_count'
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => <<<"SQL"
            select count(1)
            {$commonQueryPart}
            {$andMeetingStatusIs(Meeting::STATUS_COMPLETED)}
            /* Last month */
            and date > date_sub(curdate(), interval 1 month)
            and date <= curdate()
            SQL,
            'completed_meetings_count_last_month'
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => <<<"SQL"
            select count(1)
            {$commonQueryPart}
            {$andMeetingStatusIs(Meeting::STATUS_PLANNED)}
            SQL,
            'planned_meetings_count'
        );

        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => <<<"SQL"
            select count(1)
            {$commonQueryPart}
            {$andMeetingStatusIs(Meeting::STATUS_PLANNED)}
            /* Next month */
            and date > curdate()
            and date <= date_add(curdate(), interval 1 month)
            SQL,
            'planned_meetings_count_next_month'
        );
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig();
        $config->addQuery(
            type: TqDataTypeEnum::bool,
            columnOrQuery: fn(string $tableName) => "`managed_by_facility_id` <=> '{$this->facility->id}'",
            columnAlias: 'is_managed_by_this_facility',
        );
        self::addAttendantFields($this->facility, $config);
        return $config;
    }
}
