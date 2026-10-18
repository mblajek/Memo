<?php

namespace Tests\Helpers;

use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\DbDump;
use App\Models\User;
use App\Services\Database\DatabaseDumpHelper;
use FilesystemIterator;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RecursiveDirectoryIterator;
use Mockery;
use RecursiveIteratorIterator;
use ZipArchive;

/**
 * A separate dumps database and dumps directory, and fake database programs found first on PATH,
 * so that dumping and restoring can run without a database client and without touching the real
 * database.
 */
trait DbDumpsTrait
{
    private string $dbDumpsFile;
    private string $dumpsDir;
    private string $fakeBinDir;
    private string|false $originalPath;

    private function setUpDbDumps(): void
    {
        $this->dbDumpsFile = tempnam(sys_get_temp_dir(), 'db_dumps_test_');
        Config::set('database.connections.db_dumps.database', $this->dbDumpsFile);
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

        $this->dumpsDir = sys_get_temp_dir() . '/db_dumps_dir_test_' . Str::random(8);
        mkdir($this->dumpsDir);
        Config::set('app.db.dump_path', $this->dumpsDir);
        Config::set('app.db.dump_password', 'test-dump-password');
        Config::set('app.db.backup_auth', null);

        $this->fakeBinDir = sys_get_temp_dir() . '/db_dumps_bin_test_' . Str::random(8);
        mkdir($this->fakeBinDir);
        $this->originalPath = getenv('PATH');
        putenv("PATH={$this->fakeBinDir}:{$this->originalPath}");

        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());
    }

    private function tearDownDbDumps(): void
    {
        PermissionMiddleware::setPermissions(null);
        putenv(($this->originalPath === false) ? 'PATH' : "PATH={$this->originalPath}");
        DB::purge('db_dumps');
        unlink($this->dbDumpsFile);
        self::removeDir($this->dumpsDir);
        self::removeDir($this->fakeBinDir);
    }

    private static function removeDir(string $dir): void
    {
        $entries = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($entries as $entry) {
            if ($entry->isDir()) {
                rmdir($entry->getPathname());
            } else {
                unlink($entry->getPathname());
            }
        }
        rmdir($dir);
    }

    /** Stores a created dump of the given name, and returns its id. */
    private function insertDbDump(string $name): string
    {
        $id = Str::uuid()->toString();
        DB::connection('db_dumps')->table('db_dumps')->insert([
            'id' => $id,
            'created_at' => '2026-01-01 10:00:00',
            'updated_at' => '2026-01-01 10:00:00',
            'created_by' => User::SYSTEM,
            'updated_by' => User::SYSTEM,
            'status' => 'created',
            'name' => $name,
            'file_size' => 100,
            'app_version' => 'test',
            'is_from_rc' => false,
            'is_backuped' => false,
        ]);
        return $id;
    }

    /** Writes the archive of the dump the way dumping does, unless another file or password is given. */
    private function createDumpZip(
        string $name,
        string $sql,
        ?string $innerFile = null,
        ?string $password = null,
    ): void {
        $zipPath = DbDump::fullPath($name);
        if (!is_dir(dirname($zipPath))) {
            mkdir(dirname($zipPath));
        }
        $innerFile ??= DbDump::innerFileName($name);
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFromString($innerFile, $sql);
        $zip->setEncryptionName($innerFile, ZipArchive::EM_AES_256);
        $zip->setPassword($password ?? DatabaseDumpHelper::getDatabaseDumpPassword());
        $zip->setCompressionName($innerFile, ZipArchive::CM_DEFLATE, 9);
        $zip->close();
    }

    /** Requires Log::spy(). */
    private function expectErrorLogged(string $part): void
    {
        Log::shouldHaveReceived('error')
            ->with(Mockery::on(fn(string $message) => str_contains($message, $part)))
            ->atLeast()->once();
    }

    /** Installs a shell script as the program, run in place of the real one. */
    private function fakeProgram(string $name, string $script): void
    {
        $path = "{$this->fakeBinDir}/$name";
        file_put_contents($path, "#!/bin/sh\n$script\n");
        chmod($path, 0755);
    }

    /** A path in the directory of the fake programs, for them to record what they got. */
    private function fakeOutputPath(string $name): string
    {
        return "{$this->fakeBinDir}/$name";
    }
}
