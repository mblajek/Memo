<?php

(function () {
    $exit = function (string $error): never {
        echo "\n\n$error\n\n";
        die(1);
    };

    $exec = function (string $command, bool $echoOutput = false) use ($exit): void {
        echo str_pad("\n> $command ", 64, '.') . ' ';
        $time = microtime(true);
        exec("$command", $output, $code);
        if ($code !== 0) {
            $exit(implode("\n", $output));
        }
        echo 'OK ' . str_pad('(' . number_format(microtime(true) - $time, 2) . 's)', 8, ' ', STR_PAD_LEFT)
            . ($echoOutput ? ("\n" . implode("\n", array_map(fn(string $line) => "| $line", $output))) : '');
    };

    if (!chdir(dirname(__DIR__))) {
        $exit('Cannot change working directory');
    }
    echo "\nBuilding release:";

    $exec('git pull', true);
    $exec('rm -rf release');
    $exec('mkdir -p release/memo/');

    $exec('composer install -n -q --no-dev');
    $exec('pnpm run build');

    $exec('php artisan l5-swagger:generate');
    $exec('php artisan cache:clear');

    $exec('cp -r app/ bootstrap/ config/ database/ release/memo/');
    $exec('cp -r public/ resources/ routes/ storage/ release/memo/');
    $exec('cp -r vendor/ artisan composer.json release/memo/');

    $exec('rm -rf release/memo/storage/logs/*.log');
    $exec('touch release/memo/fresh-release.txt');

    $exec('cd release && zip -r4 memo.zip memo/');
    echo "\n\n";
})();
