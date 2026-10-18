<?php

namespace Tests\Feature;

use App\Http\Resources\AttributeResource;
use App\Models\Attribute;
use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\Enums\AttributeType;
use App\Models\Facility;
use App\Models\GroupClient;
use App\Models\Meeting;
use App\Models\Member;
use App\Models\StaffMember;
use App\Models\User;
use App\Tquery\Config\TqDataTypeEnum;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Tests\Helpers\OpenApiDocument;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

/**
 * Checks the generated OpenAPI document against the real behaviour of the endpoints: responses
 * conform to the documented schemas, documented required request fields are exactly the ones the
 * validation demands, and every documented request field is read by the validation.
 */
class OpenApiContractTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;

    private const string ADULT_CLIENT_TYPE = 'd1c57dfc-c118-49ff-ae38-6585645349ca';
    private const string MEETING_TYPE = '6e87acd5-70a0-4051-963b-42d439f44e42';
    private const string MEETING_CATEGORY = '137205e2-e9a1-4f8f-ada2-555319506b28';

    private OpenApiDocument $doc;
    private Facility $facility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->doc = OpenApiDocument::get();
        $this->prepareAdminUser();
        $this->facility = Facility::factory()->create();
        $this->prepareFacilityAdmin($this->facility, globalAdmin: true, facilityStaff: true, developer: true);
    }

    private function assertConforms(array $schema, TestResponse $response): void
    {
        self::assertSame([], $this->doc->violations($schema, json_decode($response->getContent())));
    }

    private function assertResponseConforms(string $method, string $path, TestResponse $response): void
    {
        self::assertContains($response->status(), $this->doc->responseStatuses($method, $path));
        $this->assertConforms($this->doc->responseSchema($method, $path, $response->status()), $response);
    }

    private function url(string $path, array $parameters = []): string
    {
        return strtr($path, ['{facility}' => $this->facility->id] + $parameters);
    }

    private function createClient(): User
    {
        $user = User::factory()->create();
        $client = new Client();
        $client->user_id = $user->id;
        $client->facility_id = $this->facility->id;
        $client->short_code = '-';
        $client->type_dict_id = self::ADULT_CLIENT_TYPE;
        $client->saveOrFail();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'client_id' => $client->id,
        ]);
        return $user;
    }

    private function createMeeting(): Meeting
    {
        $meeting = new Meeting();
        $meeting->fill([
            'facility_id' => $this->facility->id,
            'date' => '2030-05-01',
            'start_dayminute' => 600,
            'duration_minutes' => 60,
            'status_dict_id' => Meeting::STATUS_PLANNED,
            'category_dict_id' => self::MEETING_CATEGORY,
            'type_dict_id' => self::MEETING_TYPE,
            'is_remote' => false,
        ]);
        $meeting->saveOrFail();
        return $meeting;
    }

    private function setUpDbDumps(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'db_dumps_test_');
        $this->beforeApplicationDestroyed(function () use ($file) {
            DB::purge('db_dumps');
            unlink($file);
        });
        Config::set('database.connections.db_dumps.database', $file);
        DB::purge('db_dumps');
        Schema::connection('db_dumps')->create('db_dumps', function (Blueprint $table) {
            $table->char('id', 36);
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->char('created_by', 36);
            $table->char('updated_by', 36);
            $table->string('status', 36);
            $table->string('name')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('app_version');
            $table->dateTime('restored_rc_at')->nullable();
            $table->dateTime('restored_prod_at')->nullable();
            $table->boolean('is_from_rc');
            $table->boolean('is_backuped');
        });
    }

    public function testAttributeListConformsToSchema(): void
    {
        $path = '/api/v1/system/attribute/list';
        $this->assertResponseConforms('get', $path, $this->get($path));
    }

    public function testAttributeOfEveryTypeConformsToSchema(): void
    {
        $attribute = Attribute::query()->firstOrFail();
        foreach (AttributeType::cases() as $type) {
            $attribute->type = $type;
            $json = json_decode(json_encode(AttributeResource::make($attribute)));
            self::assertSame([], $this->doc->violations($this->doc->schema('AttributeResource'), $json), $type->name);
        }
    }

    public function testFacilityClientConformsToSchema(): void
    {
        $client = $this->createClient();
        $group = ClientGroup::query()->create(['facility_id' => $this->facility->id]);
        GroupClient::query()->create(['client_group_id' => $group->id, 'user_id' => $client->id]);
        $path = '/api/v1/facility/{facility}/user/client/list';

        $response = $this->get($this->url($path) . "?in=$client->id");

        $this->assertResponseConforms('get', $path, $response);
        self::assertSame([$group->id], $response->json('data.0.client.groupIds'));
    }

    public function testFacilityStaffConformsToSchema(): void
    {
        $user = User::factory()->create();
        Member::factory()->create([
            'user_id' => $user->id,
            'facility_id' => $this->facility->id,
            'staff_member_id' => StaffMember::factory()->create()->id,
        ]);
        $path = '/api/v1/facility/{facility}/user/staff/list';

        $this->assertResponseConforms('get', $path, $this->get($this->url($path) . "?in=$user->id"));
    }

    public function testMeetingAttendantNullabilityMatchesColumns(): void
    {
        $columns = array_column(Schema::getColumns('meeting_attendants'), 'nullable', 'name');
        foreach (['MeetingStaffResource', 'MeetingClientResource'] as $resource) {
            foreach ($this->doc->schema($resource)['properties'] as $property => $schema) {
                $column = strtolower(preg_replace('/[A-Z]/', '_$0', $property));
                if (array_key_exists($column, $columns)) {
                    self::assertSame($columns[$column], $schema['nullable'] ?? false, "$resource.$property");
                }
            }
        }
    }

    public function testStatusConformsToSchema(): void
    {
        $this->assertResponseConforms('get', '/api/v1/system/status', $this->get('/api/v1/system/status'));
        $path = '/api/v1/user/status/{facility}';
        $this->assertResponseConforms('get', $path, $this->get($this->url($path)));
    }

    public function testRequiredInParameterIsDocumented(): void
    {
        $checked = 0;
        foreach ($this->doc->operations() as $operation => $spec) {
            foreach ($spec['parameters'] ?? [] as $parameter) {
                if ($parameter['name'] === 'in' && $parameter['in'] === 'query') {
                    [$method, $path] = explode(' ', $operation);
                    $response = $this->json($method, $this->url($path));
                    self::assertSame(
                        $response->status() === 400,
                        $parameter['required'] ?? false,
                        "$operation: status {$response->status()}",
                    );
                    $checked++;
                }
            }
        }
        self::assertGreaterThan(0, $checked);
    }

    public function testSummariesAreUniqueWithinTag(): void
    {
        $seen = [];
        foreach ($this->doc->operations() as $operation => $spec) {
            $key = strtok($operation, ' ') . ' ' . implode(',', $spec['tags'] ?? []) . ': ' . $spec['summary'];
            self::assertArrayNotHasKey($key, $seen, "$operation and " . ($seen[$key] ?? ''));
            $seen[$key] = $operation;
        }
    }

    public function testTqueryConfigConformsToSchema(): void
    {
        $this->setUpDbDumps();
        $checked = 0;
        foreach (array_keys($this->doc->operations()) as $operation) {
            [$method, $path] = explode(' ', $operation);
            if ($method === 'get' && str_ends_with($path, '/tquery')) {
                $this->assertResponseConforms($method, $path, $this->get($this->url($path)));
                $checked++;
            }
        }
        self::assertGreaterThan(0, $checked);
    }

    public function testTqueryDataConformsToSchema(): void
    {
        $path = '/api/v1/admin/facility/tquery';
        $response = $this->post($path, [
            'columns' => [['type' => 'column', 'column' => 'name']],
            'paging' => ['size' => 1],
        ]);

        $this->assertResponseConforms('post', $path, $response);
        self::assertEqualsCanonicalizing(
            array_keys($this->doc->responseSchema('post', $path, 200)['properties']['meta']['properties']),
            array_keys($response->json('meta')),
        );
    }

    public function testTqueryConfigTypeEnumIsComplete(): void
    {
        $schema = $this->doc->responseSchema('get', '/api/v1/admin/facility/tquery', 200);
        $enum = $schema['properties']['columns']['items']['properties']['type']['enum'];
        foreach (TqDataTypeEnum::cases() as $type) {
            self::assertContains($type->notNullBaseType()->name, $enum, $type->name);
        }
    }

    public function testDbDumpCreateStatusIsDocumented(): void
    {
        $this->setUpDbDumps();
        Bus::fake();
        $path = '/api/v1/admin/db-dump';

        $this->assertResponseConforms('post', $path, $this->post($path, ['isFromRc' => false]));
    }

    /**
     * @return iterable<string, array{string, string, array, list<string>}> the documented path, the
     *   URL, a body with just the required fields, and the optional fields the validation reads
     */
    private function requestBodyCases(): iterable
    {
        yield 'admin user' => [
            '/api/v1/admin/user',
            '/api/v1/admin/user',
            ['name' => 'Test', 'passwordExpireAt' => null, 'otpRequiredAt' => null],
            ['email', 'hasEmailVerified', 'password', 'hasGlobalAdmin', 'managedByFacilityId'],
        ];
        yield 'log' => [
            '/api/v1/system/log',
            '/api/v1/system/log',
            ['source' => 'api_fe_js_error', 'logLevel' => 'info'],
            ['message', 'context'],
        ];
        yield 'meeting' => [
            '/api/v1/facility/{facility}/meeting',
            $this->url('/api/v1/facility/{facility}/meeting'),
            [
                'typeDictId' => self::MEETING_TYPE,
                'date' => '2030-05-01',
                'startDayminute' => 600,
                'durationMinutes' => 60,
                'statusDictId' => Meeting::STATUS_PLANNED,
                'isRemote' => false,
            ],
            ['notes', 'staff', 'clients', 'resources', 'fromMeetingId'],
        ];
        yield 'meeting clone' => [
            '/api/v1/facility/{facility}/meeting/{meeting}/clone',
            $this->url(
                '/api/v1/facility/{facility}/meeting/{meeting}/clone',
                ['{meeting}' => $this->createMeeting()->id],
            ),
            ['dates' => ['2030-05-08'], 'interval' => null],
            [],
        ];
        yield 'tquery' => [
            '/api/v1/admin/facility/tquery',
            '/api/v1/admin/facility/tquery',
            ['columns' => [['type' => 'column', 'column' => 'id']], 'paging' => ['size' => 1]],
            ['filter', 'sort', 'distinct'],
        ];
    }

    public function testRequestBodyRequiredFieldsMatchValidation(): void
    {
        foreach ($this->requestBodyCases() as $case => [$path, $url, $minimalBody]) {
            $schema = $this->doc->requestSchema('post', $path);
            self::assertEqualsCanonicalizing($schema['required'], array_keys($minimalBody), $case);

            $this->assertResponseConforms('post', $path, $this->post($url, $minimalBody));

            $response = $this->post($url);
            $response->assertBadRequest();
            self::assertEqualsCanonicalizing($schema['required'], $this->errorFields($response), $case);
        }
    }

    public function testRequestBodyDocumentedFieldsAreValidated(): void
    {
        foreach ($this->requestBodyCases() as $case => [$path, $url, $minimalBody, $optionalFields]) {
            $properties = array_keys($this->doc->requestSchema('post', $path)['properties']);
            self::assertEqualsCanonicalizing([...array_keys($minimalBody), ...$optionalFields], $properties, $case);
            foreach ($properties as $property) {
                $response = $this->post($url, [$property => ['__invalid' => [1]]] + $minimalBody);
                self::assertContains($property, $this->errorFields($response), "$case: $property");
            }
        }
    }

    /** @return list<string> the top-level request fields with validation errors */
    private function errorFields(TestResponse $response): array
    {
        $fields = array_filter(array_column($response->json('errors') ?? [], 'field'));
        return array_values(array_unique(array_map(fn(string $field) => strtok($field, '.'), $fields)));
    }
}
