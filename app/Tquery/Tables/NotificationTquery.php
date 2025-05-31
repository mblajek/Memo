<?php

namespace App\Tquery\Tables;

use App\Models\Facility;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;
use App\Tquery\Engine\TqService;

final readonly class NotificationTquery extends TqService
{
    public function __construct(protected Facility $facility)
    {
        parent::__construct();
    }

    protected function getBuilder(): TqBuilder
    {
        $builder = parent::getBuilder();
        $builder->where(
            query: fn(TqSingleBind $bind) => "`notifications`.`facility_id` = {$bind->use()}",
            or: false,
            value: $this->facility->id,
            inverse: false,
            nullable: false,
        );
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::notifications);
        $config->addBase();

        $config->addSimple(TqDataTypeEnum::string_nullable, 'address');
        $config->addSimple(TqDataTypeEnum::string, 'subject');
        $config->addSimple(TqDataTypeEnum::text_nullable, 'message');
        $config->addSimple(TqDataTypeEnum::text_nullable, 'message_html');

        $config->addSimple(TqDataTypeEnum::datetime, 'scheduled_at');
        $config->addSimple(TqDataTypeEnum::string, 'service');
        $config->addSimple(TqDataTypeEnum::string, 'status');

        $config->addJoined(TqDataTypeEnum::text_nullable, TqTableAliasEnum::error_log_entry, 'message', 'error_message');

        return $config;
    }
}
