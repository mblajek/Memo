<?php

(function () {
    $exit = function (string $error): never {
        echo "\n\n$error\n\n";
        die(1);
    };

    if (!chdir(dirname(__DIR__))) {
        $exit('Cannot change working directory');
    }

    $exec = function (string $command, bool $noSkip = true, bool $echoOutput = false) use ($exit): void {
        echo str_pad("\n> $command ", 75, '.') . ' ';
        if (!$noSkip) {
            echo '(skipped)';
            return;
        }
        $time = microtime(true);
        exec("$command", $output, $code);
        if ($code !== 0) {
            $exit("\n" . implode("\n", $output));
        }
        echo 'OK ' . str_pad('(' . number_format(microtime(true) - $time, 2) . 's)', 8, ' ', STR_PAD_LEFT);
        if ($echoOutput) {
            echo "\n" . implode("\n", array_map(fn(string $line) => "| $line", $output ?: ['(no output)']));
        }
    };

    /** @var array{pull:bool,dev:bool,prod:bool,release:bool,zip:bool} $config */
    $config = (function () use ($exit) {
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
                        . ($ruleValue ? '' : ' no') . " \"$ruleParam\""
                    );
                }
            }
            $finalConfig = $config;
        }
        return $finalConfig ?? $exit("Missing env $envConfig");
    })();

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

    $exec('cp -r app/ bootstrap/ config/ database/ release/memo/', $config['release']);
    $exec('cp -r public/ resources/ routes/ storage/ release/memo/', $config['release']);
    $exec('cp -r vendor/ artisan composer.json release/memo/', $config['release']);
    $exec('rm -rf release/memo/storage/logs/*.log', $config['release']);
    $exec('rm -rf release/memo/database/dumps/*.zip', $config['release']);

    $exec('cd release && zip -r4 memo.zip memo/', $config['zip']);
    echo "\n\n";
})();
