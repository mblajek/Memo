<?php

namespace App\Rules;

use App\Notification\Meeting\NotificationTemplate;
use Closure;

final class NotificationTemplateRule extends AbstractRule
{
    public function __construct(
        private readonly bool $acceptOuterTemplate,
    ) {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $names = [];
        foreach (NotificationTemplate::cases() as $template) {
            if ($template->isOuterTemplate() && !$this->acceptOuterTemplate) {
                continue;
            }
            $value = str_replace($template->templateString(), '', $value);
            $names[] = $template->templateString();
        }

        if (NotificationTemplate::containsTemplateChars($value)) {
            $this->validator->addFailure($attribute, 'custom.notification_template', $names);
        }
    }
}
