<?php

(function (string $basePath): never {
    $maintenanceFile = "$basePath/storage/framework/maintenance.php";
    if (file_exists($maintenanceFile)) {
        require_once $maintenanceFile; // contains "exit"
    }
    /** @var Illuminate\Foundation\Application $app */
    $app = require_once "$basePath/bootstrap/app.php";
    $app->handleRequest(Illuminate\Http\Request::capture());
    exit;
})(
    basePath: dirname(__DIR__),
);
