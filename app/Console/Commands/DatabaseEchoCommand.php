<?php

/** @noinspection PhpUnused */

namespace App\Console\Commands;

use App\Services\Database\DatabaseDumpService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Console\Output\OutputInterface;
use Throwable;
use ZipArchive;

class DatabaseEchoCommand extends Command
{
    protected $signature = 'fz:db-echo {mode}';
    protected $description = 'Echo last database dump contents';

    public function handle(): void
    {
        $mode = $this->argument('mode');

        if ($mode !== 'path' && $mode !== 'sql') {
            Log::error("Invalid mode '$mode', options: 'path', 'sql'");
            return;
        }

        $dbName = DatabaseDumpService::getDatabaseName();
        $dumpsPath = DatabaseDumpService::getDatabaseDumpsPath();
        $dumpPassword = Config::string('app.db.dump_password');

        $nameBase = DatabaseDumpService::lastDumpName($dbName, $dumpsPath);
        $innerFile = "$nameBase.sql";
        $zipPath = "$dumpsPath/$nameBase.zip";
        if ($mode === 'path') {
            $this->line($zipPath);
            return;
        }
        $zip = new ZipArchive();
        $zip->open($zipPath);

        try {
            $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
            $zip->setPassword($dumpPassword);

            $sql = $zip->getFromName($innerFile);
            $zip->close();
            if (is_string($sql)) {
                $this->output->write($sql, false, OutputInterface::OUTPUT_RAW | OutputInterface::VERBOSITY_QUIET);
            } else {
                Log::error("Cannot read item, maybe invalid password");
            }
        } catch (Throwable $e) {
            Log::error("Cannot read file '{$innerFile}' inside '{$zipPath}': {$e->getMessage()}");
        }
    }
}
