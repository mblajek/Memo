<?php

namespace App\Services\System;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\LogEntry;
use App\Utils\Texts;
use Illuminate\Http\Request;
use Throwable;
use ValueError;

class LogService
{
    /** @throws Throwable */
    public function addEntry(Request $request, string $source, string $errorLevel, string $message, ?string $context)
    {
        if (!in_array($source, LogEntry::SOURCES, true)) {
            throw new ValueError("Source must be one of: " . implode(', ', LogEntry::SOURCES));
        }
        (new LogEntry([
            'user_id' => PermissionMiddleware::permissions()->user?->id,
            'source' => $source,
            'client_ip' => $request->ip(),
            'user_agent_text_id' => Texts::getId($request->userAgent()),
            'error_level' => $errorLevel,
            'message' => $message,
            'context' => $context,
        ]))->saveOrFail();
    }
}
