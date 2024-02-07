<?php

namespace App\Tquery\Tables;

use App\Models\Facility;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\TqBuilder;

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
        $builder->where(fn(string $bind) => "members.facility_id = $bind", false, $this->facility->id, false, false);
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
                and `meetings`.`status_dict_id` = 'f6001030-c061-480e-9a5a-7013cee7ff40' /* completed */
                and `meeting_attendants`.`attendance_status_dict_id` in
                    ('1adb737f-da0f-4473-ab9c-55fc1634b397' /* ok */,
                     '1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b' /* late_present */)",
            "last_meeting_date"
        );
        return $config;
    }
}
