<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** With a cached configuration `.env` is not loaded, so request handlers must not read it directly. */
class RequestTimeConfigTest extends TestCase
{
    private array $removedEnv = [];

    protected function tearDown(): void
    {
        foreach ($this->removedEnv as $name => [$server, $env, $putenv]) {
            if ($server !== null) {
                $_SERVER[$name] = $server;
            }
            if ($env !== null) {
                $_ENV[$name] = $env;
            }
            if ($putenv !== false) {
                putenv("$name=$putenv");
            }
        }
        $this->removedEnv = [];
        parent::tearDown();
    }

    private function removeEnv(string ...$names): void
    {
        foreach ($names as $name) {
            $this->removedEnv[$name] = [$_SERVER[$name] ?? null, $_ENV[$name] ?? null, getenv($name)];
            unset($_SERVER[$name], $_ENV[$name]);
            putenv($name);
        }
    }

    public function testDocsRemoteUsesConfiguredUrl(): void
    {
        $this->removeEnv('DOCS_URL');
        Config::set('app.docs_url', 'https://docs.test/docs/');
        Http::preventStrayRequests();
        Http::fake([
            'https://docs.test/docs/pl/request-time-config.md' => Http::response(
                '# Docs',
                headers: ['Content-Type' => 'text/markdown; charset=utf-8'],
            ),
        ]);

        $this->get('/docs-remote/pl/request-time-config.md')
            ->assertOk()
            ->assertContent('# Docs')
            ->assertHeader('Content-Type', 'text/markdown; charset=utf-8');
    }

    public function testStatusUsesConfiguredEnvColors(): void
    {
        $this->removeEnv('APP_ENV_COLOR', 'APP_ENV_FG_COLOR');
        Config::set('app.env_color', '#112233');
        Config::set('app.env_fg_color', '#445566');

        $this->get('/api/v1/system/status')
            ->assertOk()
            ->assertJsonPath('data.appEnvColor', '#112233')
            ->assertJsonPath('data.appEnvFgColor', '#445566');
    }
}
