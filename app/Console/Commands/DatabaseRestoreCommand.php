<?php

namespace App\Console\Commands;

use App\Exceptions\ApiException;
use App\Http\Permissions\PermissionMiddleware;
use App\Http\Permissions\PermissionObjectCreator;
use App\Models\DbDump;
use App\Services\Database\DatabaseDumpsService;
use App\Services\Database\DatabaseDumpStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Bus;

class DatabaseRestoreCommand extends Command
{
    protected $signature = 'fz:db-restore';
    protected $description = 'Restore zipped database dump';

    public function handle(
        DatabaseDumpsService $service,
    ): int {
        PermissionMiddleware::setPermissions(PermissionObjectCreator::makeSystem());

        do {
            $isFromRc = 'b' === $this->choice('Use dump from', ['a' => 'prod', 'b' => 'rc'], 'a');
            $dumpsPage = 1;
            $dumpChoice = null;
            do {
                $lastDumps = DbDump::query()
                    ->where('is_from_rc', '=', $isFromRc)
                    ->orderByDesc('created_at')
                    ->whereIn('status', DatabaseDumpStatus::CREATE_OK)
                    ->forPage($dumpsPage, perPage: 20)
                    ->get()
                    ->mapWithKeys(fn(mixed $value, int $key) => [chr(ord('a') + $key) => $value]);

                if ($lastDumps->isEmpty()) {
                    $this->warn('There are no dumps');
                    break;
                }

                $dumpChoice = $this->choice(
                    'Select dump',
                    $lastDumps->toBase()->map(fn(DbDump $value): string => $value->name)->all()
                    + ['z' => '(show older dumps)'],
                    default: ($dumpsPage === 1) ? 'a' : 'z',
                );
                $dumpsPage++;
            } while ($dumpChoice === 'z');
        } while ($lastDumps->isEmpty());
        /** @var DbDump $dbDump */
        $dbDump = $lastDumps[$dumpChoice];

        $confirmed = false;
        do {
            $isToRc = 'b' === $this->choice('Restore to:', ['a' => 'prod', 'b' => 'rc'], 'b');
            if (!$isToRc) {
                $confirmed = $this->confirm('Are you sure to overwrite PROD?');
            }
        } while (!$isToRc && !$confirmed);

        $this->warn('Restore (overwrite) ' . ($isToRc ? 'RC' : 'PROD') . ' from ' . $dbDump->name);

        do {
            $confirmed = $this->confirm('Are you sure?');
        } while (!$confirmed);

        try {
            Bus::dispatchSync($service->restore($dbDump, $isToRc));
        } /** @noinspection PhpRedundantCatchClauseInspection */ catch (ApiException $exception) {
            if ($exception->errorCode === 'exception.db.no_fresh_prod_db_dumps') {
                $this->warn('Cannot restore PROD - no fresh database dump');
                if ($this->confirm('Create dump and retry?', true)) {
                    Bus::dispatchSync($service->create(isFromRc: false));
                    Bus::dispatchSync($service->restore($dbDump, $isToRc));
                }
            } else {
                throw $exception;
            }
        }
        return self::SUCCESS;
    }
}
