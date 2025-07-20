<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

(function () {
    $startTime = microtime(true);

    $formatTime = fn(float $time): string => number_format(microtime(true) - $time, 2) . 's';

    $color = fn(string $message, bool $ok = false): string => "\e[0;" . ($ok ? 32 : 31) . "m$message\e[0m";

    $exit = function (string $error) use ($color): never {
        echo "\n{$color("\n$error")}\n\n";
        die(1);
    };

    if (!chdir(dirname(__DIR__))) {
        $exit('Cannot change working directory');
    }


    $exec = function (string $command, bool $noSkip = true, bool $echoOutput = false) use ($exit, $formatTime): void {
        echo str_pad("\n> $command ", 75, '.') . ' ';
        if (!$noSkip) {
            echo '(skipped)';
            return;
        }
        $execStartTime = microtime(true);
        exec($command, $output, $code);
        if ($code !== 0) {
            $exit("\n" . implode("\n", $output));
        }
        echo 'OK ' . str_pad("({$formatTime($execStartTime)})", 8, ' ', STR_PAD_LEFT);
        if ($echoOutput) {
            echo "\n" . implode("\n", array_map(fn(string $line) => "| $line", $output ?: ['(no output)']));
        }
    };

    /** @var array{pull:bool,dev:bool,prod:bool,release:bool,zip:bool} $config */
    $config = (function () use ($exit): array {
        $envConfig = 'APP_BUILD_RELEASE';
        $config = array_fill_keys(['pull', 'dev', 'prod', 'release', 'zip'], false);
        $finalConfig = null;
        foreach (file('.env') as $line) {
            $line = trim($line);
            if (!preg_match("/^$envConfig=(['\"]?)([a-z,]*)(['\"]?)(.*)$/", $line, $match)) {
                continue;
            }
            if (is_array($finalConfig)) {
                $exit("Duplicate env $envConfig");
            }
            if (($match[1] !== $match[3]) || ($match[4] !== '')) {
                $exit("Invalid env $envConfig format: {$match[1]}{$match[2]}{$match[3]}{$match[4]}");
            }
            foreach (explode(',', $match[2]) as $param) {
                if (($paramValue = ($config[$param] ?? null)) !== false) {
                    $param = ($param === '') ? '""' : $param;
                    if ($paramValue) {
                        $exit("Duplicate env $envConfig parameter: $param");
                    } else {
                        $paramOptions = implode(',', array_keys($config));
                        $exit("Invalid env $envConfig parameter ($paramOptions): $param");
                    }
                }
                $config[$param] = true;
            }
            foreach (
                [
                    ['dev', false, 'prod', true],
                    ['prod', true, 'dev', false],
                    ['release', true, 'prod', true],
                    ['zip', true, 'release', true],
                ] as [$condParam, $condValue, $ruleParam, $ruleValue]
            ) {
                if ($config[$condParam] === $condValue && $config[$ruleParam] !== $ruleValue) {
                    $exit(
                        "For env $envConfig parameters:"
                        . ($condValue ? '' : ' no') . " \"$condParam\" requires"
                        . ($ruleValue ? '' : ' no') . " \"$ruleParam\"",
                    );
                }
            }
            $finalConfig = $config;
        }
        return $finalConfig ?? $exit("Missing env $envConfig");
    })();

    $knownPublicFiles = array_fill_keys([
        'public/.htaccess',
        'public/build/manifest.json',
        'public/docs/.markdownlint.json',
        'public/index.php',
        'public/robots.txt',
    ], true);
    $scanPublic = function (\Closure $scanPublic, string $dirPath = 'public') use (&$knownPublicFiles, $exit): void {
        foreach (scandir($dirPath) as $fileName) {
            if ($fileName === '.' || $fileName === '..') {
                continue;
            }
            $filePath = "$dirPath/$fileName";

            if (is_dir($filePath)) {
                $scanPublic($scanPublic, $filePath);
                continue;
            }
            if (array_key_exists($filePath, $knownPublicFiles)) {
                $knownPublicFiles[$filePath] = false;
                continue;
            }
            if (!in_array(
                pathinfo($filePath, PATHINFO_EXTENSION),
                ['css', 'js', 'map', 'md', 'png', 'svg'],
            )) {
                $exit("Unexpected public file: $filePath");
            }
        }
        if (str_contains($dirPath, '/')) {
            return;
        }
        if ($missingPublicFiles = array_filter($knownPublicFiles)) {
            $exit('Missing public files: ' . implode(', ', array_keys($missingPublicFiles)));
        }
    };

    $verifyGit = function () use ($exit): string {
        $branch = null;
        $changes = [];
        foreach (file('storage/app/git-version.txt', FILE_IGNORE_NEW_LINES) as $line) {
            if ($branch) {
                $changes[] = trim($line);
            } elseif (preg_match('/^## (.+)\.\.\./', $line, $matches)) {
                $branch = $matches[1];
            }
        }
        if (!$branch) {
            $exit('Unknown git branch in git-version.txt');
        } elseif ($changes) {
            $exit('Changed git tracked files: ' . implode(', ', $changes));
        }
        return $branch;
    };

    $exec('rm -rf release');
    $exec('mkdir -p release/memo/', $config['release']);
    $exec('git pull', $config['pull'], echoOutput: true);

    $exec('composer install -n -q', $config['dev']);
    $exec('composer install -n -q --no-dev', $config['prod']);

    $exec('pnpm run build');

    $exec('php artisan l5-swagger:generate');
    $exec('php artisan cache:clear');

    $exec('touch storage/app/fresh-release.txt');
    $exec('git log -1 --format="%H%n%ci" > storage/app/git-version.txt');
    $exec('git status -b --porcelain >> storage/app/git-version.txt');

    $scanPublic($scanPublic);
    $branch = $verifyGit();

    $exec('cp -r app/ bootstrap/ config/ database/ release/memo/', $config['release']);
    $exec('cp -r public/ resources/ routes/ storage/ release/memo/', $config['release']);
    $exec('cp -r vendor/ artisan composer.json release/memo/', $config['release']);
    $exec('rm -rf release/memo/storage/logs/*.log', $config['release']);
    $exec('rm -rf release/memo/database/dumps/*.zip', $config['release']);
    $exec('rm -rf release/memo/public/storage/*', $config['release']);
    $exec('rm -f release/memo/app/Console/Commands/DevCommand.php', $config['release']);

    $exec('cd release && zip -r4 memo.zip memo/', $config['zip']);

    $exec('composer install -n -q', $config['prod']); // install dev after no-dev

    echo "\n\nBuild finished for branch {$color($branch, $branch === 'master')} ({$formatTime($startTime)})\n\n";
})();
