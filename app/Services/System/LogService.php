<?php

namespace App\Services\System;

use App\Http\Controllers\ApiController;
use App\Http\Permissions\PermissionMiddleware;
use App\Models\LogEntry;
use App\Models\User;
use App\Utils\Texts;
use Illuminate\Http\Request;
use Throwable;
use ValueError;

class LogService
{
    /** @throws Throwable */
    public function addEntry(
        Request $request,
        string $source,
        string $logLevel,
        ?string $message,
        ?string $context = null,
        ?User $user = null,
    ): string {
        if (!in_array($source, LogEntry::SOURCES, true)) {
            throw new ValueError("Source must be one of: " . implode(', ', LogEntry::SOURCES));
        }
        $logEntry = new LogEntry([
            'app_version' => ApiController::VERSION,
            'user_id' => ($user ?? PermissionMiddleware::permissions()->user)?->id,
            'source' => $source,
            'client_ip' => $request->ip(),
            'user_agent_text_id' => Texts::getId($request->userAgent()),
            'log_level' => $logLevel,
            'message' => $message,
            'context_text_id' => Texts::getId($context),
        ]);
        $logEntry->saveOrFail();
        return $logEntry->id;
    }
}
