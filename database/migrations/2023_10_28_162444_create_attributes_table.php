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
            $table->string('table', 36)->collation('ascii_bin');
            $table->string('model', 36)->collation('ascii_bin');
            $table->string('name');
            $table->string('api_name')->collation('ascii_bin');
            $table->string('type', 36)->collation('ascii_bin');
            $table->char('dictionary_id', 36)->collation('ascii_bin')->nullable();
            $table->integer('default_order');
            $table->boolean('is_multi_value')->nullable();
            $table->string('requirement_level', 36)->collation('ascii_bin');
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->foreign('facility_id')
                ->references('id')
                ->on('facilities')
                // Setting null would men that a facility-specific attribute becomes available for everyone.
                ->restrictOnDelete();

            $table->foreign('dictionary_id')
                ->references('id')
                ->on('dictionaries')
                // Setting null would make that attribute loose connection to dictionary, while still having type 'dict', making it invalid.
                ->restrictOnDelete();
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
