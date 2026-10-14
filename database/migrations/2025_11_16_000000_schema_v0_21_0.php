<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\ColumnDefinition;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The whole database as of v0.21.0: all its tables and the fixed (system) rows.
 *
 * This replaces the migrations up to v0.21.0. A database that ran them already has all of this, so
 * there this migration does nothing. A database that ran only some of them must first be upgraded
 * by a version that still has them (v0.21.x or v0.22.x).
 *
 * Columns are in the order in which the replaced migrations added them, so that new databases are
 * identical to the upgraded ones. The only difference: new databases lack two orphaned rows of
 * values, of a meeting type deleted in the meantime.
 *
 * Conventions:
 * - Ids are UUIDs, stored as ASCII text, compared as binary.
 * - Most tables have audit columns: created_at, updated_at, and created_by, updated_by (users).
 * - Dictionaries are lists of positions (e.g. the dictionary of genders has the positions female,
 *   male…). A column referencing a position ends with `_dict_id`.
 * - The name of a dictionary, a position or an attribute is literal if it starts with "+", and
 *   then shown as is (without the "+"). Any other name is translated by the frontend; only fixed
 *   rows have such names (the app accepts only literal ones).
 * - Fixed rows are created only by migrations and cannot be changed in the app.
 */
return new class extends Migration {

    /** The last of the migrations replaced by this one. */
    private const string LAST_REPLACED_MIGRATION = '2025_11_10_122551_client_facility_id_user_id';

    /** The user that creates the fixed rows. It cannot log in. */
    private const string SYSTEM_USER = 'e144ff18-471f-456f-a1c2-971d88b3d213';

    /**
     * Fixed positions that must stay after all the others, e.g. "other", have orders above this.
     * The app gives the positions it adds orders below it.
     */
    private const int SYSTEM_ORDER = 1_000_000;

    public function up(): void
    {
        if (Schema::hasTable('users')) {
            if (DB::table('migrations')->where('migration', self::LAST_REPLACED_MIGRATION)->exists()) {
                return;
            }
            throw new RuntimeException(DB::table('migrations')->exists()
                ? 'The database is older than v0.21.0. Upgrade it with v0.21.x or v0.22.x first.'
                : 'An earlier run of this migration failed part-way. Drop all the tables and migrate again.');
        }
        // Done first, as the steps most likely to fail, so that a failure leaves no tables behind
        // (MariaDB cannot roll back creating them).
        $this->setDatabaseCollation();
        $this->createDbDumpsDatabase();
        $this->createUsersAndFacilities();
        $this->createLogs();
        $this->createDictionariesAndAttributes();
        $this->createClientsAndStaff();
        $this->createMeetings();
        $this->createNotifications();
        $this->insertFixedRows();
    }

    public function down(): void
    {
        throw new RuntimeException(
            'This migration cannot be reverted. To rebuild a database from scratch, use migrate:fresh.',
        );
    }

    // ---------------------------------------------------------------------------------------------
    // Column helpers

    private function uuid(Blueprint $table, string $name): ColumnDefinition
    {
        return $table->char($name, 36)->collation('ascii_bin');
    }

    /** A string of ASCII characters, e.g. an enum value. */
    private function ascii(Blueprint $table, string $name, int $length = 36): ColumnDefinition
    {
        return $table->string($name, $length)->collation('ascii_bin');
    }

    private function auditForeignKeys(Blueprint $table): void
    {
        $table->foreign('created_by')->references('id')->on('users');
        $table->foreign('updated_by')->references('id')->on('users');
    }

    // ---------------------------------------------------------------------------------------------
    // Tables

    private function createUsersAndFacilities(): void
    {
        // Users: staff members, clients and administrators. What a user is in a facility is stored
        // in members.
        Schema::create('users', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->string('name');
            // The login; null for users without one.
            $table->string('email')->nullable()->unique();
            $table->dateTime('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->rememberToken();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'last_login_facility_id')->nullable();
            // Set if the user is a global administrator.
            $this->uuid($table, 'global_admin_grant_id')->nullable()->unique();
            $table->dateTime('password_expire_at')->nullable();
            // The user's settings and other data kept by the frontend, as JSON.
            $table->mediumText('storage')->nullable();
            $this->uuid($table, 'updated_by');
            // The facility whose administrators manage the user (e.g. may delete them), if any.
            $this->uuid($table, 'managed_by_facility_id')->nullable();
            // Two-factor authentication (one-time passwords).
            $table->dateTime('otp_required_at')->nullable();
            $table->char('otp_secret', 32)->collation('ascii_bin')->nullable();
            // The time step of the last one-time password used, so that it cannot be used again.
            $table->bigInteger('otp_used_ts')->nullable();
        });
        // The system user is its own creator, so it is inserted before the foreign keys exist.
        DB::table('users')->insert([
            'id' => self::SYSTEM_USER,
            'name' => 'system',
            'email' => 'system',
            ...$this->audit('2023-03-08'),
        ]);

        // A grant of administrator rights, global or for a facility. Who has it is stored in the
        // tables that reference it.
        Schema::create('grants', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'created_by');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'updated_by');
            $this->auditForeignKeys($table);
        });

        Schema::create('facilities', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->string('name');
            // The facility's part of the frontend's URLs.
            $this->ascii($table, 'url')->unique();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $table->string('contact_phone')->nullable();
            // The facility's own template of the notifications about meetings, if any.
            $table->string('meeting_notification_template_subject')->nullable();
            $table->string('meeting_notification_template_message', 4096)->nullable();
            $this->auditForeignKeys($table);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users');
            $table->foreign('last_login_facility_id')->references('id')->on('facilities')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users');
            $table->foreign('managed_by_facility_id')->references('id')->on('facilities');
            $table->foreign('global_admin_grant_id')->references('id')->on('grants')->nullOnDelete();
        });
    }

    private function createLogs(): void
    {
        // Texts of any length, each stored once (the id is derived from the text). A text too long
        // for short_text is split: short_text has its beginning, long_text the rest, and both
        // have "-" at the split.
        Schema::create('texts', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->integer('length');
            $table->string('short_text', 16351);
            $table->mediumText('long_text')->nullable();
        });

        // The log of the backend and the frontend.
        Schema::create('log_entries', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->ascii($table, 'app_version');
            $this->uuid($table, 'user_id')->nullable();
            $this->ascii($table, 'source');
            $this->ascii($table, 'client_ip', 255)->nullable();
            $this->uuid($table, 'user_agent_text_id')->nullable();
            $this->ascii($table, 'log_level');
            $table->string('message', 4096)->nullable();
            // A text, but with no foreign key.
            $this->uuid($table, 'context_text_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('user_agent_text_id')->references('id')->on('texts');
            $table->index('created_at');
            $table->index('source');
            $table->index('log_level');
        });
    }

    private function createDictionariesAndAttributes(): void
    {
        // A dictionary is global (facility_id null), or a facility's own.
        Schema::create('dictionaries', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'facility_id')->nullable();
            $table->string('name');
            $table->boolean('is_fixed');
            $this->uuid($table, 'created_by');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            // Whether positions can be added to the dictionary in the app.
            $table->boolean('is_extendable');
            $this->uuid($table, 'updated_by');
            $table->foreign('facility_id')->references('id')->on('facilities');
            $this->auditForeignKeys($table);
        });

        // A position is global (facility_id null), or a facility's own. Positions are not deleted
        // once used, but disabled.
        Schema::create('positions', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'dictionary_id');
            $this->uuid($table, 'facility_id')->nullable();
            $table->string('name');
            $table->boolean('is_fixed');
            $table->integer('default_order');
            $this->uuid($table, 'created_by');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->boolean('is_disabled');
            $this->uuid($table, 'updated_by');
            $table->unique(['dictionary_id', 'default_order']);
            $table->foreign('facility_id')->references('id')->on('facilities');
            $this->auditForeignKeys($table);
            $table->foreign('dictionary_id')->references('id')->on('dictionaries');
        });

        // An attribute is a field of the objects of a table (e.g. clients). It has a column in that
        // table (is_multi_value null, only fixed attributes), or its values are stored in values.
        Schema::create('attributes', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'facility_id')->nullable();
            $this->ascii($table, 'table');
            $table->string('name');
            // The field's name, in snake_case (the API camelCases it). For an attribute with a
            // column, the column's name.
            $this->ascii($table, 'api_name', 255);
            $this->ascii($table, 'type');
            // For the attributes of type dict.
            $this->uuid($table, 'dictionary_id')->nullable();
            $table->integer('default_order');
            $table->boolean('is_multi_value')->nullable();
            // required, recommended, optional, or empty: normally no value, and the field is not
            // shown, unless something else requires it (see position_required_attributes).
            $this->ascii($table, 'requirement_level');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->boolean('is_fixed');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $table->string('description', 4096)->nullable();
            $table->unique(['table', 'api_name']);
            $table->unique(['table', 'default_order']);
            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('dictionary_id')->references('id')->on('dictionaries');
            $this->auditForeignKeys($table);
        });

        // The values of the attributes that have no column of their own. A multi-value attribute
        // has a row per value, ordered by default_order. One of the value columns is set, depending
        // on the attribute's type.
        Schema::create('values', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'attribute_id');
            // The object of the attribute's table that has this value.
            $this->uuid($table, 'object_id');
            $this->uuid($table, 'ref_dict_id')->nullable();
            // An object of any table, e.g. a user or an attribute, so with no foreign key.
            $this->uuid($table, 'ref_object_id')->nullable();
            $table->string('string_value', 4096)->nullable();
            $table->integer('int_value')->nullable();
            $table->dateTime('datetime_value')->nullable();
            $this->uuid($table, 'created_by');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'updated_by');
            $table->integer('default_order');
            $table->foreign('attribute_id')->references('id')->on('attributes');
            $table->index('object_id');
            $table->foreign('ref_dict_id')->references('id')->on('positions');
            $table->index('ref_object_id');
            $this->auditForeignKeys($table);
        });
    }

    private function createClientsAndStaff(): void
    {
        Schema::create('staff_members', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $table->dateTime('deactivated_at')->nullable();
            $this->auditForeignKeys($table);
        });

        // A client of a facility. The fixed single-value attributes of clients have columns here.
        Schema::create('clients', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'gender_dict_id')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('notes', 4096)->nullable();
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $this->uuid($table, 'type_dict_id');
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('address_street_number')->nullable();
            $table->string('address_postal_code')->nullable();
            $table->string('address_city')->nullable();
            $table->date('contact_start_at')->nullable();
            $table->date('contact_end_at')->nullable();
            // A short identifier of the client, or "-" for none.
            $this->ascii($table, 'short_code');
            // Both: the same as in the member whose client_id is this client.
            $this->uuid($table, 'user_id')->unique();
            $this->uuid($table, 'facility_id');
            $this->auditForeignKeys($table);
            $table->foreign('gender_dict_id')->references('id')->on('positions');
            $table->foreign('type_dict_id')->references('id')->on('positions');
            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('user_id')->references('id')->on('users');
        });

        // A user in a facility: as a staff member, a client, an administrator, or a combination.
        Schema::create('members', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'user_id');
            $this->uuid($table, 'facility_id');
            $this->uuid($table, 'staff_member_id')->nullable()->unique();
            $this->uuid($table, 'client_id')->nullable()->unique();
            $this->uuid($table, 'facility_admin_grant_id')->nullable()->unique();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $table->unique(['user_id', 'facility_id']);
            $table->index('user_id');
            $table->index('facility_id');
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('staff_member_id')->references('id')->on('staff_members')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('clients')->nullOnDelete();
            $table->foreign('facility_admin_grant_id')->references('id')->on('grants')->nullOnDelete();
            $this->auditForeignKeys($table);
        });

        // A group of clients that attend meetings together, e.g. a family.
        Schema::create('client_groups', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $this->uuid($table, 'facility_id');
            $table->string('notes', 4096)->nullable();
            $this->auditForeignKeys($table);
            $table->foreign('facility_id')->references('id')->on('facilities');
        });

        Schema::create('group_clients', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $this->uuid($table, 'client_group_id');
            // The client's user.
            $this->uuid($table, 'user_id');
            // The client's role in the group, as free text. The positions of the dictionary
            // clientGroupClientRole are offered as presets.
            $table->string('role')->nullable();
            $table->unique(['client_group_id', 'user_id']);
            $this->auditForeignKeys($table);
            $table->foreign('client_group_id')->references('id')->on('client_groups');
            $table->foreign('user_id')->references('id')->on('users');
        });
    }

    private function createMeetings(): void
    {
        // Meetings, and also the work time and leave time entries of the staff (meetings of the
        // system category). The fixed attributes of meetings have columns here.
        Schema::create('meetings', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'facility_id');
            // Copied from the category of the meeting type.
            $this->uuid($table, 'category_dict_id');
            $this->uuid($table, 'type_dict_id');
            $table->string('notes', 4096)->nullable();
            $table->date('date');
            // The start time, in minutes since midnight.
            $table->integer('start_dayminute');
            $table->integer('duration_minutes');
            $this->uuid($table, 'status_dict_id');
            $table->boolean('is_remote');
            $this->uuid($table, 'created_by');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'updated_by');
            // A meeting of a series: the interval, and the id of the meeting the series was
            // created from, also set on that meeting (with no foreign key, as that meeting can be
            // deleted).
            $this->ascii($table, 'interval')->nullable();
            $this->uuid($table, 'from_meeting_id')->nullable();
            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('category_dict_id')->references('id')->on('positions');
            $table->foreign('type_dict_id')->references('id')->on('positions');
            $table->foreign('status_dict_id')->references('id')->on('positions');
            $this->auditForeignKeys($table);
            $table->index('from_meeting_id');
            $table->index(['from_meeting_id', 'date', 'start_dayminute']);
        });

        // The staff members and the clients of a meeting.
        Schema::create('meeting_attendants', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'meeting_id');
            $this->uuid($table, 'user_id');
            $this->uuid($table, 'attendance_status_dict_id');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            // Staff or client.
            $this->uuid($table, 'attendance_type_dict_id');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            // The group with which a client attends, if any.
            $this->uuid($table, 'client_group_id')->nullable();
            $table->unique(['meeting_id', 'user_id']);
            $table->foreign('meeting_id')->references('id')->on('meetings');
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('attendance_status_dict_id')->references('id')->on('positions');
            $table->foreign('attendance_type_dict_id')->references('id')->on('positions');
            $this->auditForeignKeys($table);
            $table->foreign('client_group_id')->references('id')->on('client_groups');
            $table->index(
                ['meeting_id', 'attendance_type_dict_id', 'attendance_status_dict_id'],
                'meeting_attendants__meeting_type_status__index',
            );
        });

        // The resources of a meeting, e.g. rooms.
        Schema::create('meeting_resources', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $this->uuid($table, 'meeting_id');
            $this->uuid($table, 'resource_dict_id');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $table->unique(['meeting_id', 'resource_dict_id']);
            $table->foreign('meeting_id')->references('id')->on('meetings');
            $table->foreign('resource_dict_id')->references('id')->on('positions');
            $this->auditForeignKeys($table);
            // Redundant with the unique key above.
            $table->index(['meeting_id', 'resource_dict_id']);
        });
    }

    private function createNotifications(): void
    {
        // Notifications to send (e.g. SMS about meetings), and the ones sent.
        Schema::create('notifications', function (Blueprint $table) {
            $this->uuid($table, 'id')->primary();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $this->uuid($table, 'created_by');
            $this->uuid($table, 'updated_by');
            $this->uuid($table, 'facility_id')->nullable();
            $this->uuid($table, 'user_id')->nullable();
            $this->uuid($table, 'meeting_id')->nullable();
            $this->uuid($table, 'notification_method_dict_id');
            // E.g. the phone number.
            $table->string('address')->nullable();
            $table->string('subject', 4096);
            $table->string('message', 4096)->nullable();
            $table->string('message_html', 4096)->nullable();
            $table->dateTime('scheduled_at');
            // The service that sent the notification.
            $this->ascii($table, 'service')->nullable();
            $this->ascii($table, 'status');
            // The error of the last failed attempt to send.
            $this->uuid($table, 'error_log_entry_id')->nullable();
            $this->auditForeignKeys($table);
            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('meeting_id')->references('id')->on('meetings');
            $table->foreign('notification_method_dict_id')->references('id')->on('positions');
            $table->foreign('error_log_entry_id')->references('id')->on('log_entries');
        });
    }

    /** The default character set and collation of the database: the ones of the connection. */
    private function setDatabaseCollation(): void
    {
        ['database' => $database, 'charset' => $charset, 'collation' => $collation] = DB::getConfig();
        DB::statement("ALTER DATABASE `$database` CHARACTER SET `$charset` COLLATE `$collation`");
    }

    /**
     * The database of the database dumps (backups made in the app), kept in an SQLite file outside
     * the main database, so that restoring a dump does not affect it.
     */
    private function createDbDumpsDatabase(): void
    {
        $connection = DB::connection('db_dumps');
        $databaseFile = $connection->getConfig('database');
        if (!file_exists($databaseFile)) {
            file_put_contents($databaseFile, '');
            chmod($databaseFile, 0600);
        }
        if ($connection->getSchemaBuilder()->hasTable('db_dumps')) {
            return;
        }
        $connection->getSchemaBuilder()->create('db_dumps', function (Blueprint $table) {
            $table->char('id', 36)->collation('binary');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->char('created_by', 36)->collation('binary');
            $table->char('updated_by', 36)->collation('binary');
            $table->string('status', 36)->collation('binary');
            $table->string('name')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('app_version');
            $table->dateTime('restored_rc_at')->nullable();
            $table->dateTime('restored_prod_at')->nullable();
            $table->boolean('is_from_rc');
            $table->boolean('is_backuped');
        });
        // The schema builder fails to create this index in SQLite.
        $connection->statement('create index "db_dumps_created_at_index" on "db_dumps"("created_at")');
    }

    // ---------------------------------------------------------------------------------------------
    // Fixed rows

    /** The audit columns of a fixed row, created by the system user on the given date. */
    private function audit(string $date): array
    {
        return [
            'created_at' => $date,
            'updated_at' => $date,
            'created_by' => self::SYSTEM_USER,
            'updated_by' => self::SYSTEM_USER,
        ];
    }

    private function insertFixedRows(): void
    {
        $gender = 'c21c1557-4617-42ae-ad20-12f8f89fb12b';
        $voivodeship = 'd96a602d-c10f-4e9d-a3ad-4c450efa7717';
        $meetingType = '4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0';
        $meetingCategory = 'ce12aa23-a5db-49f3-987b-d2db3ab24a3b';
        $meetingStatus = '3865a3c3-0038-4668-9d55-5d05b79d7fcd';
        $attendanceStatus = 'a2874757-aca7-4c16-a0dc-2fc368f795fb';
        $meetingResource = 'fdb0f818-aa1e-4ed9-97cc-2a3cb1b702df';
        $attendanceType = '1f68adf4-e0b7-495b-a6ea-305987cf2a33';
        $clientType = '931d1276-3e20-4348-a7d1-ccde6705ae1d';
        $notificationMethod = '99e5b807-933d-4fd7-b2d9-3a5350b83cab';
        $positionGroup = 'a8348d97-84e6-4304-9c72-257d044c374d';
        $clientGroupClientRole = 'f5d88a3b-6f3d-4b4a-8fed-208e1ee980d1';

        $dictionary = fn(string $id, string $name, bool $isExtendable, string $date) => [
            'id' => $id,
            'facility_id' => null,
            'name' => $name,
            'is_fixed' => true,
            'is_extendable' => $isExtendable,
            ...$this->audit($date),
        ];
        DB::table('dictionaries')->insert([
            $dictionary($gender, 'gender', true, '2023-07-13'),
            $dictionary($voivodeship, 'pl_voivodeship', false, '2023-07-13'),
            $dictionary($meetingType, 'meetingType', true, '2023-11-02'),
            $dictionary($meetingCategory, 'meetingCategory', true, '2023-11-02'),
            $dictionary($meetingStatus, 'meetingStatus', false, '2023-11-12 19:00:00'),
            $dictionary($attendanceStatus, 'attendanceStatus', true, '2023-11-12 19:00:00'),
            $dictionary($meetingResource, 'meetingResource', true, '2023-11-12 19:00:00'),
            $dictionary($attendanceType, 'attendanceType', false, '2024-03-01'),
            $dictionary($clientType, 'clientType', true, '2024-03-11'),
            $dictionary($notificationMethod, 'notificationMethod', false, '2024-03-28'),
            // Groups of the positions of other dictionaries (see the position_group attribute).
            $dictionary($positionGroup, 'positionGroup', true, '2024-04-10'),
            $dictionary($clientGroupClientRole, 'clientGroupClientRole', true, '2024-08-19'),
        ]);

        $otherMeetingType = '6e87acd5-70a0-4051-963b-42d439f44e42';
        $workTime = 'efaf3dbb-d5d1-481b-9724-0f23f566e1fd';
        $leaveTime = 'c47b1483-cef9-4f5f-bc89-419104cc55d9';
        $otherMeetingCategory = '137205e2-e9a1-4f8f-ada2-555319506b28';
        $systemMeetingCategory = '2903ea34-6188-4972-b84c-d3dc4047ee3c';

        $position = fn(string $id, string $dictionaryId, string $name, int $order, string $date) => [
            'id' => $id,
            'dictionary_id' => $dictionaryId,
            'facility_id' => null,
            'name' => $name,
            'is_fixed' => true,
            'default_order' => $order,
            'is_disabled' => false,
            ...$this->audit($date),
        ];
        DB::table('positions')->insert([
            $position('1f3e095c-938b-4367-b3cc-7ef25ab1de70', $gender, 'female', 1, '2023-07-13'),
            $position('4b694d4e-2447-4e15-aba4-d24ac769da49', $gender, 'male', 2, '2023-07-13'),
            $position('51293720-2cd2-4072-b692-4bd4fe7587dc', $gender, 'other', 3, '2023-07-13'),
            $position('eeb429d1-a804-44b3-9cd6-1f9f45dfce48', $gender, 'unknown', 4, '2023-07-13'),

            // Not translated, as they are Polish names.
            $position('4afca5eb-9992-40c7-8471-106881d30061', $voivodeship, '+dolnośląskie', 2, '2023-07-13'),
            $position('7f8494e4-ee0a-434e-bb7f-7d1cff2d2f0e', $voivodeship, '+kujawsko-pomorskie', 4, '2023-07-13'),
            $position('8209b8c1-b79e-4e87-a6b1-13019e51f3fb', $voivodeship, '+lubelskie', 6, '2023-07-13'),
            $position('fff916bd-aad2-47e0-a9bc-42f99deb48c5', $voivodeship, '+lubuskie', 8, '2023-07-13'),
            $position('662d9bab-2471-4b9e-9d77-c34eb5def56b', $voivodeship, '+łódzkie', 10, '2023-07-13'),
            $position('686f53b4-7f4d-4992-b6fd-072bb08543a1', $voivodeship, '+małopolskie', 12, '2023-07-13'),
            $position('724dc49b-5ab9-4ca7-b88a-d7c37d3c050f', $voivodeship, '+mazowieckie', 14, '2023-07-13'),
            $position('1ba5a225-6189-43da-9053-416a747db326', $voivodeship, '+opolskie', 16, '2023-07-13'),
            $position('4e17613f-3c94-416a-916a-bc239a0ba311', $voivodeship, '+podkarpackie', 18, '2023-07-13'),
            $position('bc7b76de-d81f-4359-9d08-c89e567af3c4', $voivodeship, '+podlaskie', 20, '2023-07-13'),
            $position('e141f09c-03e0-436f-a748-0530e1ccb0b5', $voivodeship, '+pomorskie', 22, '2023-07-13'),
            $position('f9d4ace3-36b8-4f34-bdc7-39e69dc0dd21', $voivodeship, '+śląskie', 24, '2023-07-13'),
            $position('57301758-86ab-4660-8acf-69ea3d11f78b', $voivodeship, '+świętokrzyskie', 26, '2023-07-13'),
            $position('4a0e4408-c0dc-4ffd-98e7-1aa0620453cd', $voivodeship, '+warmińsko-mazurskie', 28, '2023-07-13'),
            $position('e0deb63c-9283-4024-8804-ac7418ef9b3b', $voivodeship, '+wielkopolskie', 30, '2023-07-13'),
            $position('75059b8f-0c73-46b5-a48a-0fd45864b3d4', $voivodeship, '+zachodniopomorskie', 32, '2023-07-13'),

            // The facilities add their own meeting types; these come after them.
            $position($otherMeetingType, $meetingType, 'other', self::SYSTEM_ORDER + 1, '2023-11-02'),
            $position($workTime, $meetingType, 'work_time', self::SYSTEM_ORDER + 2, '2024-02-18'),
            $position($leaveTime, $meetingType, 'leave_time', self::SYSTEM_ORDER + 3, '2024-02-18'),

            $position($otherMeetingCategory, $meetingCategory, 'other', self::SYSTEM_ORDER + 1, '2023-11-23'),
            // The category of work time and leave time.
            $position($systemMeetingCategory, $meetingCategory, 'system', self::SYSTEM_ORDER + 2, '2024-02-18'),

            $position('86aaead1-bbcc-4af1-a74a-ed2bdff46d0a', $meetingStatus, 'planned', 1, '2022-11-25'),
            $position('f6001030-c061-480e-9a5a-7013cee7ff40', $meetingStatus, 'completed', 2, '2022-11-25'),
            $position('fb3ffe88-f8c1-455b-a4d6-2448d6cfaaf5', $meetingStatus, 'cancelled', 3, '2022-11-25'),

            $position('1adb737f-da0f-4473-ab9c-55fc1634b397', $attendanceStatus, 'ok', 1, '2023-11-25'),
            $position('1ce7a7ac-3562-4dff-bd4b-5eee8eb8f90b', $attendanceStatus, 'late_present', 2, '2024-01-21'),
            $position('40c978a9-f63a-439a-a58e-11b8513ed63d', $attendanceStatus, 'too_late', 3, '2024-01-21'),
            $position('6833fc51-39dd-4dfe-8652-ca79adc8b644', $attendanceStatus, 'no_show', 4, '2024-01-21'),
            $position('f39903be-45b2-4e85-a3cb-aada4e81b9be', $attendanceStatus, 'cancelled', 5, '2023-11-25'),

            $position('6e1bad86-8b69-43ac-81c1-82f564f2ffb8', $attendanceType, 'staff', 1, '2024-03-01'),
            $position('e2d3c06c-ea2d-4808-adca-6be2c1ea23c2', $attendanceType, 'client', 2, '2024-03-01'),

            $position('9c5b47e5-d0ea-4604-a903-858462cb51a8', $clientType, 'child', 1, '2024-03-11'),
            $position('d1c57dfc-c118-49ff-ae38-6585645349ca', $clientType, 'adult', 2, '2024-03-11'),

            $position('35a4c273-44b8-4039-a79f-391213973f58', $notificationMethod, 'sms', 1, '2024-03-28'),
        ]);

        $positionCategory = 'c9ab3795-0012-4cfe-8100-a7bb1dd9755b';
        $positionDuration = '540e2b26-1330-42ae-8209-55cf22bb3638';
        $positionRequiredAttributes = 'c97a3c3b-7faa-4f51-9113-2390ebaba700';

        $attribute = fn(
            string $id,
            string $table,
            string $name,
            string $apiName,
            string $type,
            ?string $dictionaryId,
            int $order,
            ?bool $isMultiValue,
            string $requirementLevel,
            string $date,
        ) => [
            'id' => $id,
            'facility_id' => null,
            'table' => $table,
            'name' => $name,
            'api_name' => $apiName,
            'type' => $type,
            'dictionary_id' => $dictionaryId,
            'default_order' => $order,
            'is_multi_value' => $isMultiValue,
            'requirement_level' => $requirementLevel,
            'is_fixed' => true,
            'description' => null,
            ...$this->audit($date),
        ];
        // Arguments: id, table, name, api name, type, dictionary, order, multi-value (null for the
        // attributes with a column), requirement level, date.
        DB::table('attributes')->insert([
            // Attributes of meetings, their attendants and their resources, all with columns.
            $attribute('5f7d5e66-03f9-4bcd-a726-fde82cf98d6f', 'meetings', 'type', 'type_dict_id',
                'dict', $meetingType, 1, null, 'required', '2023-11-12 19:00:00'),
            $attribute('8111626d-130c-454d-b0c0-9fda9ab9917a', 'meetings', 'category', 'category_dict_id',
                'dict', $meetingCategory, 2, null, 'required', '2023-11-12 19:00:00'),
            $attribute('e443e2c2-82fc-41d3-8fda-fe374e5329d3', 'meetings', 'status', 'status_dict_id',
                'dict', $meetingStatus, 3, null, 'required', '2023-11-12 19:00:00'),
            $attribute('c005ade5-2d01-4576-b050-93c9e7251518', 'meeting_attendants', 'attendance_status',
                'attendance_status_dict_id', 'dict', $attendanceStatus, 1, null, 'required', '2023-11-12 19:00:00'),
            $attribute('ff2fb31e-c992-4e2d-b543-f2768ee1c897', 'meeting_resources', 'resource', 'resource_dict_id',
                'dict', $meetingResource, 1, null, 'required', '2023-11-12 19:00:00'),

            // The attributes that every position of a dictionary must have a value of.
            $attribute($positionRequiredAttributes, 'dictionaries', 'position_required_attributes',
                'position_required_attribute_ids', 'attributes', null, 1, true, 'optional', '2023-11-22'),

            // Attributes of positions. With the requirement level empty, a position has no value
            // of them, unless its dictionary requires them (see position_required_attributes).
            $attribute($positionCategory, 'positions', 'category', 'category_dict_id',
                'dict', $meetingCategory, 1, false, 'empty', '2023-11-22'),
            $attribute($positionDuration, 'positions', 'duration_minutes', 'duration_minutes',
                'int', null, 2, false, 'empty', '2023-11-22'),
            $attribute('f434e7e6-186b-40b0-82b0-8c58f9fb45fc', 'positions', 'position_group', 'position_group_dict_id',
                'dict', $positionGroup, 3, false, 'optional', '2024-04-10'),

            // Attributes of clients, in their default order.
            $attribute('f28a6833-2369-4b41-a005-23aee3c31b22', 'clients', 'short_code', 'short_code',
                'string', null, 1, null, 'optional', '2024-07-31'),
            $attribute('b9685bc6-ab47-42bd-99e8-68badf0c1291', 'clients', 'type', 'type_dict_id',
                'dict', $clientType, 2, null, 'required', '2024-03-11'),
            $attribute('0e56d086-5bf7-46c0-8359-38e9edf8c627', 'clients', 'gender', 'gender_dict_id',
                'dict', $gender, 3, null, 'recommended', '2023-11-01'),
            $attribute('a8f3fc00-cda2-4ce0-8bd4-12c223944191', 'clients', 'notes', 'notes',
                'text', null, 4, null, 'optional', '2024-03-08'),
            $attribute('3217bb30-58a3-40c0-8f02-313f195cd459', 'clients', 'urgent_notes', 'urgent_notes',
                'string', null, 5, true, 'optional', '2025-08-11'),
            $attribute('7a678df3-c9b1-4133-9520-d388c823a186', 'clients', 'birth_date', 'birth_date',
                'date', null, 6, null, 'recommended', '2024-03-08'),
            $attribute('50e76d71-bcad-473f-983b-3e9f5e00d6f7', 'clients', 'contact_email', 'contact_email',
                'string', null, 7, null, 'recommended', '2024-03-28'),
            $attribute('9722feb5-f804-4ac9-8d8d-6ebc319da50d', 'clients', 'contact_phone', 'contact_phone',
                'string', null, 8, null, 'recommended', '2024-03-28'),
            $attribute('fd077aac-4341-480c-a27a-0695ad152339', 'clients', 'address_street_number',
                'address_street_number', 'string', null, 9, null, 'optional', '2024-03-28'),
            $attribute('dc0fca68-93e6-4d82-af31-36d00fd9ae83', 'clients', 'address_postal_code',
                'address_postal_code', 'string', null, 10, null, 'optional', '2024-03-28'),
            $attribute('d90522a3-960b-4217-af88-b636fcd3d349', 'clients', 'address_city', 'address_city',
                'string', null, 11, null, 'optional', '2024-03-28'),
            $attribute('a783d287-26de-4566-9314-64d3eb285037', 'clients', 'contact_start_at', 'contact_start_at',
                'date', null, 12, null, 'recommended', '2024-03-28'),
            $attribute('c2f0dda4-68b3-481b-aa25-62595caa40fd', 'clients', 'contact_end_at', 'contact_end_at',
                'date', null, 13, null, 'optional', '2024-03-28'),
            $attribute('e1c14100-070d-4213-8927-6b7aed9617a4', 'clients', 'documents_links', 'documents_links',
                'text', null, 14, true, 'optional', '2024-03-28'),
            $attribute('c0742816-fb80-46de-b7d9-374e4057a2e3', 'clients', 'notification_methods',
                'notification_method_dict_ids', 'dict', $notificationMethod, 15, true, 'optional', '2024-03-28'),
        ]);

        $value = fn(
            string $id,
            string $attributeId,
            string $objectId,
            array $value,
            string $date,
        ) => [
            'id' => $id,
            'attribute_id' => $attributeId,
            'object_id' => $objectId,
            'ref_dict_id' => null,
            'ref_object_id' => null,
            'string_value' => null,
            'int_value' => null,
            'datetime_value' => null,
            ...$value,
            'default_order' => 1,
            ...$this->audit($date),
        ];
        DB::table('values')->insert([
            // Every meeting type has a category and a duration.
            $value('2a58e858-721b-4e8c-8d18-f419c408fc42', $positionRequiredAttributes, $meetingType,
                ['ref_object_id' => $positionDuration], '2023-11-22'),
            $value('b97bf226-359c-42a7-b3a9-4fa2accdf18d', $positionRequiredAttributes, $meetingType,
                ['ref_object_id' => $positionCategory], '2023-11-22'),

            // The fixed meeting types have no default duration (0).
            $value('69acb967-8f0d-4404-bcfd-83d22e6b2e3b', $positionCategory, $otherMeetingType,
                ['ref_dict_id' => $otherMeetingCategory], '2023-11-22'),
            $value('2b623b96-9299-48af-9605-9998f03d2e21', $positionDuration, $otherMeetingType,
                ['int_value' => 0], '2023-11-22'),
            $value('1b9ceaf6-757c-428d-8625-499047fa785c', $positionCategory, $workTime,
                ['ref_dict_id' => $systemMeetingCategory], '2024-02-18'),
            $value('48d0e70c-9b72-4d86-860a-137d370debed', $positionDuration, $workTime,
                ['int_value' => 0], '2024-02-18'),
            $value('3703d301-9533-47ae-8e3f-34236c62d22b', $positionCategory, $leaveTime,
                ['ref_dict_id' => $systemMeetingCategory], '2024-02-18'),
            $value('163625d9-3e2e-48e8-becc-dbfb4771e081', $positionDuration, $leaveTime,
                ['int_value' => 0], '2024-02-18'),
        ]);
    }
};
