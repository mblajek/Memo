<?php

namespace Tests\Tquery\Tables;

use App\Models\Facility;
use App\Tquery\Tables\StaffTquery;

class StaffTqueryTest extends TqueryConfigTest
{
    protected function createTqService(): StaffTquery
    {
        return new StaffTquery(Facility::factory()->makeOne(['id' => 'facility-id']));
    }

    public function testConfig()
    {
        $this->assertEquals(
            [
                'id' => '`users`.`id`',
                'name' => '`users`.`name`',
                'email' => '`users`.`email`',
                'lastLoginFacility.id' => '`users`.`last_login_facility_id`',
                'lastLoginFacility.name' => '`last_login_facility`.`name`',
                'hasPassword' => '(`users`.`password`) is not null',
                'passwordExpireAt' => '`users`.`password_expire_at`',
                'createdAt' => '`users`.`created_at`',
                'updatedAt' => '`users`.`updated_at`',
                'hasEmailVerified' => '(`users`.`email_verified_at`) is not null',
                'createdBy.id' => '`users`.`created_by`',
                'createdBy.name' => '`created_by`.`name`',
                'hasGlobalAdmin' => '(`users`.`global_admin_grant_id`) is not null',
                'facilities.count' => '(select count(1) from `members` where `members`.`user_id` = `users`.`id`)',
                '_count' => '(count(1))',
                'firstMeetingDate' => <<<"SQL"
                (select min(`meetings`.`date`)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = 'facility-id'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in ('1adb737f-da0f-4473-ab9c-55fc1634b397',
                                     '1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b')
                and `meetings`.`category_dict_id` != '2903ea34-6188-4972-b84c-d3dc4047ee3c'
                and `meetings`.`deleted_at` is null
                and `meetings`.`status_dict_id` = 'f6001030-c061-480e-9a5a-7013cee7ff40')
                SQL,
                'lastMeetingDate' => <<<"SQL"
                (select max(`meetings`.`date`)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = 'facility-id'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in ('1adb737f-da0f-4473-ab9c-55fc1634b397',
                                     '1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b')
                and `meetings`.`category_dict_id` != '2903ea34-6188-4972-b84c-d3dc4047ee3c'
                and `meetings`.`deleted_at` is null
                and `meetings`.`status_dict_id` = 'f6001030-c061-480e-9a5a-7013cee7ff40')
                SQL,
                'completedMeetingsCount' => <<<"SQL"
                (select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = 'facility-id'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in ('1adb737f-da0f-4473-ab9c-55fc1634b397',
                                     '1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b')
                and `meetings`.`category_dict_id` != '2903ea34-6188-4972-b84c-d3dc4047ee3c'
                and `meetings`.`deleted_at` is null
                and `meetings`.`status_dict_id` = 'f6001030-c061-480e-9a5a-7013cee7ff40')
                SQL,
                'completedMeetingsCountLastMonth' => <<<"SQL"
                (select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = 'facility-id'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in ('1adb737f-da0f-4473-ab9c-55fc1634b397',
                                     '1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b')
                and `meetings`.`category_dict_id` != '2903ea34-6188-4972-b84c-d3dc4047ee3c'
                and `meetings`.`deleted_at` is null
                and `meetings`.`status_dict_id` = 'f6001030-c061-480e-9a5a-7013cee7ff40'
                /* Last month */
                and date > date_sub(curdate(), interval 1 month)
                and date <= curdate())
                SQL,
                'plannedMeetingsCount' => <<<"SQL"
                (select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = 'facility-id'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in ('1adb737f-da0f-4473-ab9c-55fc1634b397',
                                     '1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b')
                and `meetings`.`category_dict_id` != '2903ea34-6188-4972-b84c-d3dc4047ee3c'
                and `meetings`.`deleted_at` is null
                and `meetings`.`status_dict_id` = '86aaead1-bbcc-4af1-a74a-ed2bdff46d0a')
                SQL,
                'plannedMeetingsCountNextMonth' => <<<"SQL"
                (select count(1)
                from `meetings`
                inner join `meeting_attendants` on `meetings`.`id` = `meeting_attendants`.`meeting_id`
                where `meetings`.`facility_id` = 'facility-id'
                and `meeting_attendants`.`user_id` = `users`.`id`
                and `meeting_attendants`.`attendance_status_dict_id` in ('1adb737f-da0f-4473-ab9c-55fc1634b397',
                                     '1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b')
                and `meetings`.`category_dict_id` != '2903ea34-6188-4972-b84c-d3dc4047ee3c'
                and `meetings`.`deleted_at` is null
                and `meetings`.`status_dict_id` = '86aaead1-bbcc-4af1-a74a-ed2bdff46d0a'
                /* Next month */
                and date > curdate()
                and date <= date_add(curdate(), interval 1 month))
                SQL,
                'staff.hasFacilityAdmin' => "(`members`.`facility_admin_grant_id`) is not null"
            ],
            $this->getSelectQueries()
        );
    }
}
