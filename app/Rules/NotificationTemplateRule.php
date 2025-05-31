<?php

namespace App\Rules;

use App\Notification\Meeting\NotificationTemplate;
use Closure;

final class NotificationTemplateRule extends AbstractRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $names = [];
        foreach (NotificationTemplate::cases() as $template) {
            $value = str_replace($template->templateString(), '', $value);
            $names[] = $template->name;
        }

        if (NotificationTemplate::containsTemplateChars($value)) {
            $this->validator->addFailure($attribute, 'custom.notification_template', ['templates' => $names]);
        }
    }
}
