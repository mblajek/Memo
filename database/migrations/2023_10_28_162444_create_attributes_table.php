<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('attributes', function (Blueprint $table) {
            $table->char('id', 36)->collation('ascii_bin')->primary();
            $table->char('facility_id', 36)->collation('ascii_bin')->nullable();
            $table->char('table');
            $table->char('model');
            $table->char('name');
            $table->char('api_name');
            $table->char('type');
            $table->char('dictionary_id', 36)->collation('ascii_bin')->nullable();
            $table->integer('default_order');
            $table->boolean('is_multi_value')->nullable();
            $table->char('requirement_level');



            $table->timestamps();

            $table->foreign('facility_id')
                ->references('id')
                ->on('facilities')
                // Null has special meaning in this table ('any facility'), maybe it should restrict or cascade
                //(otherwise facility-specific attributes become available to everyone).
                ->onDelete('set null');

            $table->foreign('dictionary_id')
                ->references('id')
                ->on('dictionaries')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attributes');
    }
};
