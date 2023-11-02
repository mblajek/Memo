<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dictionaries', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('facility_id', 36)->collation('ascii_bin')->nullable();
            $table->string('name');
            $table->boolean('is_fixed');

            $table->char('created_by', 36)->collation('ascii_bin');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('created_by')->references('id')->on('users');
        });
        Schema::create('positions', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('dictionary_id', 36)->collation('ascii_bin');
            $table->char('facility_id', 36)->collation('ascii_bin')->nullable();
            $table->string('name');
            $table->boolean('is_fixed');
            $table->integer('default_order');

            $table->char('created_by', 36)->collation('ascii_bin');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['dictionary_id', 'default_order']);
            $table->foreign('dictionary_id')->references('id')->on('dictionaries');
            $table->foreign('facility_id')->references('id')->on('facilities');
            $table->foreign('created_by')->references('id')->on('users');
        });

        $date = '2023-07-13 00:00:00';
        $systemUserId = 'e144ff18-471f-456f-a1c2-971d88b3d213';

        DB::table('dictionaries')->insertOrIgnore([
            [
                'id' => 'c21c1557-4617-42ae-ad20-12f8f89fb12b',
                'name' => 'gender',
                'is_fixed' => true,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => 'pl_voivodeship',
                'is_fixed' => true,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ]);

        DB::table('positions')->insert([
            [
                'id' => '1f3e095c-938b-4367-b3cc-7ef25ab1de70',
                'dictionary_id' => 'c21c1557-4617-42ae-ad20-12f8f89fb12b',
                'name' => 'female',
                'is_fixed' => true,
                'default_order' => 1,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '4b694d4e-2447-4e15-aba4-d24ac769da49',
                'dictionary_id' => 'c21c1557-4617-42ae-ad20-12f8f89fb12b',
                'name' => 'male',
                'is_fixed' => true,
                'default_order' => 2,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '51293720-2cd2-4072-b692-4bd4fe7587dc',
                'dictionary_id' => 'c21c1557-4617-42ae-ad20-12f8f89fb12b',
                'name' => 'other',
                'is_fixed' => true,
                'default_order' => 3,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'eeb429d1-a804-44b3-9cd6-1f9f45dfce48',
                'dictionary_id' => 'c21c1557-4617-42ae-ad20-12f8f89fb12b',
                'name' => 'unknown',
                'is_fixed' => true,
                'default_order' => 4,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '4afca5eb-9992-40c7-8471-106881d30061',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+dolnośląskie',
                'is_fixed' => true,
                'default_order' => 2,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '7f8494e4-ee0a-434e-bb7f-7d1cff2d2f0e',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+kujawsko-pomorskie',
                'is_fixed' => true,
                'default_order' => 4,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '8209b8c1-b79e-4e87-a6b1-13019e51f3fb',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+lubelskie',
                'is_fixed' => true,
                'default_order' => 6,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'fff916bd-aad2-47e0-a9bc-42f99deb48c5',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+lubuskie',
                'is_fixed' => true,
                'default_order' => 8,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '662d9bab-2471-4b9e-9d77-c34eb5def56b',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+łódzkie',
                'is_fixed' => true,
                'default_order' => 10,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '686f53b4-7f4d-4992-b6fd-072bb08543a1',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+małopolskie',
                'is_fixed' => true,
                'default_order' => 12,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '724dc49b-5ab9-4ca7-b88a-d7c37d3c050f',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+mazowieckie',
                'is_fixed' => true,
                'default_order' => 14,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '1ba5a225-6189-43da-9053-416a747db326',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+opolskie',
                'is_fixed' => true,
                'default_order' => 16,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '4e17613f-3c94-416a-916a-bc239a0ba311',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+podkarpackie',
                'is_fixed' => true,
                'default_order' => 18,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'bc7b76de-d81f-4359-9d08-c89e567af3c4',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+podlaskie',
                'is_fixed' => true,
                'default_order' => 20,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'e141f09c-03e0-436f-a748-0530e1ccb0b5',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+pomorskie',
                'is_fixed' => true,
                'default_order' => 22,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'f9d4ace3-36b8-4f34-bdc7-39e69dc0dd21',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+śląskie',
                'is_fixed' => true,
                'default_order' => 24,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '57301758-86ab-4660-8acf-69ea3d11f78b',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+świętokrzyskie',
                'is_fixed' => true,
                'default_order' => 26,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '4a0e4408-c0dc-4ffd-98e7-1aa0620453cd',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+warmińsko-mazurskie',
                'is_fixed' => true,
                'default_order' => 28,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => 'e0deb63c-9283-4024-8804-ac7418ef9b3b',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+wielkopolskie',
                'is_fixed' => true,
                'default_order' => 30,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
            [
                'id' => '75059b8f-0c73-46b5-a48a-0fd45864b3d4',
                'dictionary_id' => 'd96a602d-c10f-4e9d-a3ad-4c450efa7717',
                'name' => '+zachodniopomorskie',
                'is_fixed' => true,
                'default_order' => 32,
                'created_by' => $systemUserId,
                'created_at' => $date,
                'updated_at' => $date,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('positions');
        Schema::dropIfExists('dictionaries');
    }
};
