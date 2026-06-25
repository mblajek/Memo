<?php

namespace Tests\Feature\Validation;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * End-to-end validation behaviour on a representative endpoint (admin user PATCH),
 * exercising the full request -> validate -> ValidationExceptionRenderer path so we
 * assert the actual `validation.*` codes a client receives.
 *
 * This documents the (currently inconsistent) presence/null handling at the HTTP layer
 * and locks in the masking-bug fix end-to-end. The "null accepted as default" side of
 * the inconsistency is covered at the validator level in ValidRuleTest.
 */
class ValidationEndpointBehaviorTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private const URL = '/api/v1/admin/user/%s';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private function patchUser(array $data): TestResponse
    {
        $user = User::factory()->create();
        return $this->patch(sprintf(self::URL, $user->id), $data);
    }

    /** @return string[] the codes attached to the given field in the error response. */
    private function fieldCodes(TestResponse $result, string $field): array
    {
        return array_column(
            array_filter($result->json('errors'), fn(array $e) => ($e['field'] ?? null) === $field),
            'code',
        );
    }

    public function testAbsentFieldsAreSkippedOnPatch(): void
    {
        // Every field on the PATCH validator is `sometimes`, so an empty body validates.
        $this->patchUser([])->assertOk();
    }

    public function testPresentNullOnNonNullableFieldIsRejected(): void
    {
        // `name` is not nullable: sending it as null (present) is rejected, even though
        // omitting it entirely is fine. This is the "required even when null" behaviour.
        $result = $this->patchUser(['name' => null]);
        $result->assertBadRequest();
        self::assertContains('validation.required', $this->fieldCodes($result, 'name'));
    }

    public function testInvalidValueRendersBuiltInRuleCode(): void
    {
        $result = $this->patchUser(['email' => 'not-an-email']);
        $result->assertBadRequest();
        self::assertContains('validation.email', $this->fieldCodes($result, 'email'));
    }

    public function testOverlongStringRendersMaxValidationError(): void
    {
        // A value beyond the field's max length renders as validation.max.string.
        $result = $this->patchUser(['name' => str_repeat('a', 300)]);
        $result->assertBadRequest();
        self::assertContains('validation.max.string', $this->fieldCodes($result, 'name'));
    }
}
