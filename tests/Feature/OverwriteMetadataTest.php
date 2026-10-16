<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\Attribute;
use App\Models\Enums\AttributeTable;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class OverwriteMetadataTest extends TestCase
{
    use DatabaseTransactions;

    private const string URL = '/api/v1/admin/developer/overwrite-metadata';

    protected function setUp(): void
    {
        parent::setUp();
        $creator = new PermissionObjectCreator();
        $creator->user = User::query()->findOrFail(User::SYSTEM);
        $creator->loggedIn = true;
        $creator->verified = true;
        $creator->globalAdmin = true;
        $creator->developer = true;
        PermissionMiddleware::setPermissions($creator->getPermissionObject());
    }

    public function testEveryModelIsAnExistingTableWithAuditColumns(): void
    {
        foreach (AttributeTable::cases() as $table) {
            $this->assertTrue(
                Schema::hasColumns($table->value, ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']),
                "$table->name: $table->value",
            );
        }
    }

    public function testOverwritesFacilityMetadata(): void
    {
        $facility = Facility::factory()->create();
        $user = User::factory()->create();

        $result = $this->post(self::URL, [
            'model' => 'facility',
            'id' => $facility->id,
            'createdAt' => '2020-01-02T03:04:05Z',
            'updatedBy' => $user->id,
        ]);

        $result->assertOk();
        $this->assertTrue($result->json('data'));
        $row = DB::table('facilities')->where('id', $facility->id)->first();
        $this->assertSame('2020-01-02 03:04:05', $row->created_at);
        $this->assertSame($user->id, $row->updated_by);
    }

    public function testOverwritesValueMetadata(): void
    {
        $id = Str::uuid()->toString();
        DB::table('values')->insert([
            'id' => $id,
            'attribute_id' => Attribute::query()->firstOrFail()->id,
            'object_id' => Str::uuid()->toString(),
            'string_value' => 'test',
            'default_order' => 1,
            'created_by' => User::SYSTEM,
            'updated_by' => User::SYSTEM,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-01 00:00:00',
        ]);

        $result = $this->post(self::URL, [
            'model' => 'value',
            'id' => $id,
            'createdAt' => '2020-01-02T03:04:05Z',
        ]);

        $result->assertOk();
        $this->assertTrue($result->json('data'));
        $this->assertSame('2020-01-02 03:04:05', DB::table('values')->where('id', $id)->value('created_at'));
    }

    public function testNoFieldsToOverwriteIsANoOp(): void
    {
        $facility = Facility::factory()->create();
        $before = DB::table('facilities')->where('id', $facility->id)->first();

        $result = $this->post(self::URL, ['model' => 'facility', 'id' => $facility->id]);

        $result->assertOk();
        $this->assertFalse($result->json('data'));
        $this->assertEquals($before, DB::table('facilities')->where('id', $facility->id)->first());
    }
}
