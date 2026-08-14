<?php

namespace Tests\Feature;

use App\Models\Dictionary;
use App\Models\Position;
use App\Utils\DatabaseMigrationHelper\DatabaseMigrationHelper;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * Extensive coverage of the default_order invariants maintained by DefaultOrderManager:
 * within one scope, the non-system rows (default_order < SYSTEM_ORDER_OFFSET) always form
 * a single contiguous block starting from 1, and rows at or above the system offset are
 * never moved.
 *
 * The invariants are exercised end-to-end through the position endpoints as the
 * representative orderable entity; the entity endpoint test files keep only smoke-level
 * ordering checks.
 */
class DefaultOrderManagerTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private const string URL = '/api/v1/admin/position';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private function makeDictionary(): Dictionary
    {
        return Dictionary::factory()->create();
    }

    private function createPosition(string $dictionaryId, ?int $order = null): string
    {
        $this->prepareAdminUser();
        $data = [
            'facilityId' => null,
            'dictionaryId' => $dictionaryId,
            'name' => 'pos-' . Str::random(8),
            'isFixed' => false,
            'isDisabled' => false,
        ] + ($order === null ? [] : ['defaultOrder' => $order]);
        $result = $this->post(self::URL, $data);
        $result->assertCreated();
        return $result->json('data.id');
    }

    /** @return list<int> the non-system orders of the dictionary, sorted ascending */
    private function orders(string $dictionaryId): array
    {
        return Position::query()
            ->where('dictionary_id', $dictionaryId)
            ->where('default_order', '<', DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET)
            ->orderBy('default_order')
            ->pluck('default_order')
            ->map(fn($o) => (int) $o)
            ->all();
    }

    private function order(string $positionId): int
    {
        return (int) Position::query()->findOrFail($positionId)->default_order;
    }

    public function testCreateAssignsContiguousOrdersFromOne(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id);
        $b = $this->createPosition($dictionary->id);
        $c = $this->createPosition($dictionary->id);

        self::assertSame([1, 2, 3], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($a));
        self::assertSame(2, $this->order($b));
        self::assertSame(3, $this->order($c));
    }

    public function testCreateAtMiddleShiftsLaterRows(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id); // 3

        $d = $this->createPosition($dictionary->id, order: 2);

        self::assertSame([1, 2, 3, 4], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($a));
        self::assertSame(2, $this->order($d));
        self::assertSame(3, $this->order($b));
        self::assertSame(4, $this->order($c));
    }

    public function testCreateBeyondEndClampsToAppend(): void
    {
        $dictionary = $this->makeDictionary();
        $this->createPosition($dictionary->id); // 1
        $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id, order: 99);

        self::assertSame([1, 2, 3], $this->orders($dictionary->id));
        self::assertSame(3, $this->order($c));
    }

    public function testReorderUpwardKeepsBlockContiguous(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id); // 3
        $d = $this->createPosition($dictionary->id); // 4

        $this->patch(self::URL . "/$a", ['defaultOrder' => 3])->assertOk();

        self::assertSame([1, 2, 3, 4], $this->orders($dictionary->id));
        self::assertSame(3, $this->order($a));
        self::assertSame(1, $this->order($b));
        self::assertSame(2, $this->order($c));
        self::assertSame(4, $this->order($d));
    }

    public function testReorderDownwardKeepsBlockContiguous(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id); // 3
        $d = $this->createPosition($dictionary->id); // 4

        $this->patch(self::URL . "/$d", ['defaultOrder' => 1])->assertOk();

        self::assertSame([1, 2, 3, 4], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($d));
        self::assertSame(2, $this->order($a));
        self::assertSame(3, $this->order($b));
        self::assertSame(4, $this->order($c));
    }

    public function testReorderOneStepForwardAndBack(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id); // 3
        $d = $this->createPosition($dictionary->id); // 4

        $this->patch(self::URL . "/$b", ['defaultOrder' => 3])->assertOk();
        self::assertSame([1, 2, 3, 4], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($a));
        self::assertSame(2, $this->order($c));
        self::assertSame(3, $this->order($b));
        self::assertSame(4, $this->order($d));

        $this->patch(self::URL . "/$b", ['defaultOrder' => 2])->assertOk();
        self::assertSame([1, 2, 3, 4], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($a));
        self::assertSame(2, $this->order($b));
        self::assertSame(3, $this->order($c));
        self::assertSame(4, $this->order($d));
    }

    public function testReorderBeyondEndClampsToLast(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id); // 3

        $this->patch(self::URL . "/$a", ['defaultOrder' => 99])->assertOk();
        self::assertSame([1, 2, 3], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($b));
        self::assertSame(2, $this->order($c));
        self::assertSame(3, $this->order($a));
    }

    public function testReorderToCurrentPositionKeepsOrders(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id); // 3

        $this->patch(self::URL . "/$b", ['defaultOrder' => 2])->assertOk();
        self::assertSame([1, 2, 3], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($a));
        self::assertSame(2, $this->order($b));
        self::assertSame(3, $this->order($c));
    }

    public function testDeleteCompactsTheBlock(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id); // 3
        $d = $this->createPosition($dictionary->id); // 4

        $this->delete(self::URL . "/$b")->assertOk();

        self::assertNull(Position::query()->find($b));
        self::assertSame([1, 2, 3], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($a));
        self::assertSame(2, $this->order($c));
        self::assertSame(3, $this->order($d));
    }

    public function testDeleteLastLeavesNoGap(): void
    {
        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $c = $this->createPosition($dictionary->id); // 3

        $this->delete(self::URL . "/$c")->assertOk();

        self::assertSame([1, 2], $this->orders($dictionary->id));
        self::assertSame(1, $this->order($a));
        self::assertSame(2, $this->order($b));
    }

    public function testSystemOrderRowsAreNeverShifted(): void
    {
        $dictionary = $this->makeDictionary();
        $systemOrder = DatabaseMigrationHelper::SYSTEM_ORDER_OFFSET + 5;
        $system = Position::factory()->fixed()->create([
            'dictionary_id' => $dictionary->id,
            'default_order' => $systemOrder,
        ]);
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2

        $c = $this->createPosition($dictionary->id, order: 1); // insert-shift: c=1, a=2, b=3
        self::assertSame($systemOrder, $this->order($system->id));

        $this->patch(self::URL . "/$c", ['defaultOrder' => 3])->assertOk(); // a=1, b=2, c=3
        self::assertSame($systemOrder, $this->order($system->id));

        $this->delete(self::URL . "/$a")->assertOk(); // compact: b=1, c=2
        self::assertSame($systemOrder, $this->order($system->id));
        self::assertSame([1, 2], $this->orders($dictionary->id));
    }

    public function testOperationsDoNotAffectOtherScopes(): void
    {
        $other = $this->makeDictionary();
        $x = $this->createPosition($other->id); // 1
        $y = $this->createPosition($other->id); // 2

        $dictionary = $this->makeDictionary();
        $a = $this->createPosition($dictionary->id); // 1
        $b = $this->createPosition($dictionary->id); // 2
        $this->createPosition($dictionary->id, order: 1); // insert-shift
        $this->patch(self::URL . "/$a", ['defaultOrder' => 3])->assertOk(); // reorder
        $this->delete(self::URL . "/$b")->assertOk(); // remove-compact

        self::assertSame([1, 2], $this->orders($other->id));
        self::assertSame(1, $this->order($x));
        self::assertSame(2, $this->order($y));
    }
}
