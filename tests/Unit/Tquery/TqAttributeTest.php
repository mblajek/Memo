<?php

namespace Tests\Unit\Tquery;

use App\Models\Attribute;
use App\Models\Enums\AttributeType;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqTableAliasEnum;
use PHPUnit\Framework\TestCase;

class TqAttributeTest extends TestCase
{
    private static function attribute(AttributeType $type, ?bool $multi): Attribute
    {
        $attribute = (new Attribute())->forceFill([
            'table' => 'clients',
            'api_name' => 'testAttr',
            'type' => $type->value,
            'is_multi_value' => $multi,
            'is_fixed' => $multi === null,
            'requirement_level' => 'optional',
            'dictionary_id' => null,
        ]);
        $attribute->id = 'a0000000-0000-0000-0000-000000000000';
        return $attribute;
    }

    /** All select queries of a config holding a single attribute column, joined for easy matching. */
    private static function attributeSelectSql(AttributeType $type, ?bool $multi): string
    {
        $config = new TqConfig(table: TqTableAliasEnum::clients);
        $config->addAttribute(self::attribute($type, $multi), 'client');
        return implode("\n", array_map(fn($column) => $column->getSelectQuery(), $config->columns));
    }

    public function testSingleDateAttributeWrapsValueInDate(): void
    {
        // Date attributes share the datetime_value column; the select must reduce it to a date,
        // otherwise the API emits "Y-m-d H:i:s", which the client cannot parse as an ISO date.
        $sql = self::attributeSelectSql(AttributeType::Date, multi: false);
        self::assertStringContainsString('date(`datetime_value`)', $sql);
    }

    public function testMultiValueDateAttributeWrapsValueInDate(): void
    {
        // The list path aggregates raw column values, so the date() wrap must be inside the json_arrayagg.
        $sql = self::attributeSelectSql(AttributeType::Date, multi: true);
        self::assertStringContainsString('json_arrayagg(date(`datetime_value`)', $sql);
    }

    public function testFixedDateAttributeUsesRawColumn(): void
    {
        // is_multi_value === null is a fixed attribute backed by a real DATE column, not by
        // `values`.`datetime_value`, so it must be referenced directly with no date() wrap.
        $sql = self::attributeSelectSql(AttributeType::Date, multi: null);
        self::assertStringContainsString('`clients`.`testAttr`', $sql);
        self::assertStringNotContainsString('date(', $sql);
        self::assertStringNotContainsString('datetime_value', $sql);
    }

    public function testDatetimeAttributeIsNotWrappedInDate(): void
    {
        // Datetime keeps the time part (rendered to ISO by the renderer), so it must stay unwrapped.
        $sql = self::attributeSelectSql(AttributeType::Datetime, multi: false);
        self::assertStringContainsString('`datetime_value`', $sql);
        self::assertStringNotContainsString('date(`datetime_value`)', $sql);
    }
}
