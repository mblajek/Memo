<?php

namespace Tests\Helpers;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use L5Swagger\GeneratorFactory;
use RuntimeException;

/**
 * The OpenAPI document generated from the application's annotations with the same tooling as a
 * release build, plus a checker telling whether a decoded JSON value conforms to a schema of it.
 *
 * The checker covers what a client generated from the document relies on: object vs array,
 * required and undocumented properties, nullability, enums and scalar types. An enum that lists
 * `'...'` is an abbreviated, open list and is not checked.
 */
final class OpenApiDocument
{
    private static ?self $instance = null;

    private function __construct(private readonly array $document)
    {
    }

    /** Generates the document once per process; must be called with the application booted. */
    public static function get(): self
    {
        if (self::$instance === null) {
            $dir = sys_get_temp_dir() . '/openapi_test_' . bin2hex(random_bytes(4));
            Config::set('l5-swagger.defaults.paths.docs', $dir);
            try {
                app(GeneratorFactory::class)->make(Config::string('l5-swagger.default'))->generateDocs();
                $json = File::get("$dir/" . Config::string('l5-swagger.documentations.default.paths.docs_json'));
            } finally {
                File::deleteDirectory($dir);
            }
            self::$instance = new self(json_decode($json, associative: true, flags: JSON_THROW_ON_ERROR));
        }
        return self::$instance;
    }

    /** @return array<string, array> operations keyed by "<method> <path>" */
    public function operations(): array
    {
        $operations = [];
        foreach ($this->document['paths'] as $path => $pathItem) {
            foreach ($pathItem as $method => $operation) {
                if (in_array($method, ['get', 'put', 'post', 'patch', 'delete'], true)) {
                    $operations["$method $path"] = $operation;
                }
            }
        }
        return $operations;
    }

    public function operation(string $method, string $path): array
    {
        return $this->document['paths'][$path][strtolower($method)]
            ?? throw new RuntimeException("No operation $method $path in the OpenAPI document");
    }

    public function requestSchema(string $method, string $path): array
    {
        return $this->resolve(
            $this->operation($method, $path)['requestBody']['content']['application/json']['schema']
            ?? throw new RuntimeException("No JSON request body for $method $path"),
        );
    }

    public function responseSchema(string $method, string $path, int $status): array
    {
        return $this->resolve(
            $this->operation($method, $path)['responses'][$status]['content']['application/json']['schema']
            ?? throw new RuntimeException("No JSON $status response for $method $path"),
        );
    }

    /** @return list<int> the documented response statuses */
    public function responseStatuses(string $method, string $path): array
    {
        return array_map(intval(...), array_keys($this->operation($method, $path)['responses']));
    }

    public function schema(string $name): array
    {
        return $this->resolve(['$ref' => "#/components/schemas/$name"]);
    }

    /** Follows `$ref` and merges `allOf` into a single schema. */
    public function resolve(array $schema): array
    {
        while (isset($schema['$ref'])) {
            $name = substr($schema['$ref'], strlen('#/components/schemas/'));
            // the referenced schema decides the type; siblings like nullable or description add to it
            $schema = array_diff_key($schema, ['$ref' => true, 'type' => true])
                + $this->document['components']['schemas'][$name];
        }
        foreach ($schema['allOf'] ?? [] as $part) {
            $part = $this->resolve($part);
            $schema['properties'] = ($schema['properties'] ?? []) + ($part['properties'] ?? []);
            $schema['required'] = [...($schema['required'] ?? []), ...($part['required'] ?? [])];
        }
        unset($schema['allOf']);
        return $schema;
    }

    /**
     * @param mixed $value a JSON value decoded with objects as `stdClass`, so that an empty object
     *   is told apart from an empty array
     * @return list<string> the places where the value does not conform to the schema
     */
    public function violations(array $schema, mixed $value, string $at = '$'): array
    {
        $schema = $this->resolve($schema);
        if ($value === null) {
            return ($schema['nullable'] ?? false) ? [] : ["$at: null, but the schema is not nullable"];
        }
        $type = $schema['type']
            ?? (isset($schema['properties']) ? 'object' : (isset($schema['items']) ? 'array' : null));
        if ($type === 'array') {
            if (!is_array($value)) {
                return ["$at: expected an array, got " . get_debug_type($value)];
            }
            $violations = [];
            foreach ($value as $index => $item) {
                $violations = [...$violations, ...$this->violations($schema['items'] ?? [], $item, "{$at}[$index]")];
            }
            return $violations;
        }
        if ($type === 'object') {
            if (!is_object($value)) {
                return ["$at: expected an object, got " . get_debug_type($value)];
            }
            $value = get_object_vars($value);
            $properties = $schema['properties'] ?? [];
            $violations = [];
            foreach ($schema['required'] ?? [] as $required) {
                if (!array_key_exists($required, $value)) {
                    $violations[] = "$at.$required: required, but missing";
                }
            }
            foreach ($value as $key => $item) {
                if (array_key_exists($key, $properties)) {
                    $violations = [...$violations, ...$this->violations($properties[$key], $item, "$at.$key")];
                } elseif (isset($schema['properties']) && !($schema['additionalProperties'] ?? false)) {
                    $violations[] = "$at.$key: not documented";
                }
            }
            return $violations;
        }
        $violations = [];
        if (isset($schema['enum']) && !in_array('...', $schema['enum'], true)
            && !in_array($value, $schema['enum'], true)) {
            $violations[] = "$at: " . json_encode($value) . ' is not in the enum ' . json_encode($schema['enum']);
        }
        $typeMatches = match ($type) {
            'string', 'date', 'datetime' => is_string($value),
            'integer', 'int' => is_int($value),
            'number', 'float' => is_int($value) || is_float($value),
            'boolean', 'bool' => is_bool($value),
            default => true,
        };
        if (!$typeMatches) {
            $violations[] = "$at: expected $type, got " . get_debug_type($value);
        } elseif (($schema['format'] ?? null) === 'uuid' && !Str::isUuid($value)) {
            $violations[] = "$at: " . json_encode($value) . ' is not a UUID';
        }
        return $violations;
    }
}
