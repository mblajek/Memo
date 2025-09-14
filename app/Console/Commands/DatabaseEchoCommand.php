<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpHelper;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;
use Symfony\Component\Console\Output\OutputInterface;
use Throwable;
use ZipArchive;

class DatabaseEchoCommand extends Command
{
    protected $signature = 'fz:db-echo {id}';
    protected $description = 'Echo database dump contents for DatabaseRestoreJob';

    public function handle(): int
    {
        DatabaseDumpHelper::checkDumpsEnabled();
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());

        $dbDump = DbDump::query()
            ->whereIn('status', DatabaseDumpStatus::CREATE_OK)
            ->findOrFail(Uuid::fromString($this->argument('id')));

        $dumpName = $dbDump->name;
        $innerFile = DbDump::innerFileName($dumpName);
        $zipPath = DbDump::fullPath($dumpName);

        try {
            $zip = new ZipArchive();
            $zip->open($zipPath);
            $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
            $zip->setPassword(DatabaseDumpHelper::getDatabaseDumpPassword());
            $sql = $zip->getFromName($innerFile);
            $zip->close();
            if (!is_string($sql)) {
                Log::error("Cannot read item, maybe invalid password");
                return self::FAILURE;
            }
        } catch (Throwable $e) {
            Log::error("Cannot read file '{$innerFile}' inside '{$zipPath}': {$e->getMessage()}");
            return self::FAILURE;
        }

        $this->output->write($sql, false, OutputInterface::OUTPUT_RAW | OutputInterface::VERBOSITY_QUIET);

        return self::SUCCESS;
    }
}
