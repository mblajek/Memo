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
            $openResult = $zip->open($zipPath);
            if ($openResult !== true) {
                return $this->failWith("Cannot open '{$zipPath}': " . self::openErrorMessage($openResult));
            }
            $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
            $zip->setPassword(DatabaseDumpHelper::getDatabaseDumpPassword());
            $sql = $zip->getFromName($innerFile);
            $readError = $zip->getStatusString();
            $zip->close();
            if (!is_string($sql)) {
                return $this->failWith("Cannot read file '{$innerFile}' inside '{$zipPath}': {$readError}");
            }
        } catch (Throwable $e) {
            return $this->failWith("Cannot read file '{$innerFile}' inside '{$zipPath}': {$e->getMessage()}");
        }

        $this->output->write($sql, false, OutputInterface::OUTPUT_RAW | OutputInterface::VERBOSITY_QUIET);

        return self::SUCCESS;
    }

    /** Standard output carries only the dump contents, so errors go to stderr. */
    private function failWith(string $message): int
    {
        Log::error($message);
        $this->output->getErrorStyle()
            ->writeln($message, OutputInterface::OUTPUT_RAW | OutputInterface::VERBOSITY_QUIET);
        return self::FAILURE;
    }

    private static function openErrorMessage(int $code): string
    {
        return match ($code) {
            ZipArchive::ER_NOENT => 'No such file',
            ZipArchive::ER_NOZIP => 'Not a zip archive',
            ZipArchive::ER_INCONS => 'Zip archive inconsistent',
            ZipArchive::ER_OPEN => 'Cannot open file',
            ZipArchive::ER_READ => 'Read error',
            default => "Zip error {$code}",
        };
    }
}
