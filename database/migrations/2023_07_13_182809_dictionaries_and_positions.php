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

        $date = "'2022-07-13 00:00:00'";
        $systemUserId = "'e144ff18-471f-456f-a1c2-971d88b3d213'";
        DB::statement(
            <<<"SQL"
            insert into dictionaries (id, name, is_fixed, created_by, created_at, updated_at) values
            ('c21c1557-4617-42ae-ad20-12f8f89fb12b', 'gender', 1, $systemUserId, $date, $date),
            ('d96a602d-c10f-4e9d-a3ad-4c450efa7717', 'pl_voivodeship', 1, $systemUserId, $date, $date);
SQL
        );
        DB::statement(
            <<<"SQL"
            insert into positions (id, dictionary_id, name, is_fixed, default_order, created_by, created_at, updated_at) values
            ('1f3e095c-938b-4367-b3cc-7ef25ab1de70', 'c21c1557-4617-42ae-ad20-12f8f89fb12b', 'female', 1, 1, $systemUserId, $date, $date),
            ('4b694d4e-2447-4e15-aba4-d24ac769da49', 'c21c1557-4617-42ae-ad20-12f8f89fb12b', 'male', 1, 2, $systemUserId, $date, $date),
            ('51293720-2cd2-4072-b692-4bd4fe7587dc', 'c21c1557-4617-42ae-ad20-12f8f89fb12b', 'other', 1, 3, $systemUserId, $date, $date),
            ('eeb429d1-a804-44b3-9cd6-1f9f45dfce48', 'c21c1557-4617-42ae-ad20-12f8f89fb12b', 'unknown', 1, 4, $systemUserId, $date, $date),
            ('4afca5eb-9992-40c7-8471-106881d30061', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+dolnośląskie', 1, 2, $systemUserId, $date, $date),
            ('7f8494e4-ee0a-434e-bb7f-7d1cff2d2f0e', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+kujawsko-pomorskie', 1, 4, $systemUserId, $date, $date),
            ('8209b8c1-b79e-4e87-a6b1-13019e51f3fb', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+lubelskie', 1, 6, $systemUserId, $date, $date),
            ('fff916bd-aad2-47e0-a9bc-42f99deb48c5', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+lubuskie', 1, 8, $systemUserId, $date, $date),
            ('662d9bab-2471-4b9e-9d77-c34eb5def56b', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+łódzkie', 1, 10, $systemUserId, $date, $date),
            ('686f53b4-7f4d-4992-b6fd-072bb08543a1', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+małopolskie', 1, 12, $systemUserId, $date, $date),
            ('724dc49b-5ab9-4ca7-b88a-d7c37d3c050f', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+mazowieckie', 1, 14, $systemUserId, $date, $date),
            ('1ba5a225-6189-43da-9053-416a747db326', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+opolskie', 1, 16, $systemUserId, $date, $date),
            ('4e17613f-3c94-416a-916a-bc239a0ba311', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+podkarpackie', 1, 18, $systemUserId, $date, $date),
            ('bc7b76de-d81f-4359-9d08-c89e567af3c4', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+podlaskie', 1, 20, $systemUserId, $date, $date),
            ('e141f09c-03e0-436f-a748-0530e1ccb0b5', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+pomorskie', 1, 22, $systemUserId, $date, $date),
            ('f9d4ace3-36b8-4f34-bdc7-39e69dc0dd21', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+śląskie', 1, 24, $systemUserId, $date, $date),
            ('57301758-86ab-4660-8acf-69ea3d11f78b', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+świętokrzyskie', 1, 26, $systemUserId, $date, $date),
            ('4a0e4408-c0dc-4ffd-98e7-1aa0620453cd', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+warmińsko-mazurskie', 1, 28, $systemUserId, $date, $date),
            ('e0deb63c-9283-4024-8804-ac7418ef9b3b', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+wielkopolskie', 1, 30, $systemUserId, $date, $date),
            ('75059b8f-0c73-46b5-a48a-0fd45864b3d4', 'd96a602d-c10f-4e9d-a3ad-4c450efa7717', '+zachodniopomorskie', 1, 32, $systemUserId, $date, $date);
SQL
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::drop('positions');
        Schema::drop('dictionaries');
    }
};
