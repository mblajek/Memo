<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\Traits\HasDeletedBy;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class ModelUserRelationsTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepareAdminUser();
    }

    public function testCreatedByAndUpdatedByLoadUsers(): void
    {
        $creator = User::factory()->create();
        $updater = User::factory()->create();
        $facility = Facility::factory()->create(['created_by' => $creator->id, 'updated_by' => $updater->id]);

        $lazy = Facility::query()->findOrFail($facility->id);
        $this->assertInstanceOf(User::class, $lazy->createdBy);
        $this->assertSame($creator->id, $lazy->createdBy->id);
        $this->assertInstanceOf(User::class, $lazy->updatedBy);
        $this->assertSame($updater->id, $lazy->updatedBy->id);

        $eager = Facility::query()->with(['createdBy', 'updatedBy'])->findOrFail($facility->id);
        $this->assertSame($creator->id, $eager->createdBy?->id);
        $this->assertSame($updater->id, $eager->updatedBy?->id);
    }

    public function testDeletedByLoadsUser(): void
    {
        $deleter = User::factory()->create();
        $model = new class () extends Model {
            use HasDeletedBy;

            protected $table = 'facilities';
        };
        $model->deleted_by = $deleter->id;

        $this->assertInstanceOf(User::class, $model->deletedBy);
        $this->assertSame($deleter->id, $model->deletedBy->id);
    }
}
