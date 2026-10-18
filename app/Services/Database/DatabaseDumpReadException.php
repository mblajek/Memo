<?php

namespace App\Services\Database;

use RuntimeException;

/**
 * The SQL of a dump cannot be read. The message says why, in a form fit for the log and the
 * console.
 */
final class DatabaseDumpReadException extends RuntimeException
{
}
