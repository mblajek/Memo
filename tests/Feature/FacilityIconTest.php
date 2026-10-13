<?php

namespace Tests\Feature;

use App\Http\Permissions\PermissionMiddleware;
use App\Models\Facility;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Helpers\AdminEndpointHelpers;
use Tests\Helpers\UserTrait;
use Tests\TestCase;

class FacilityIconTest extends TestCase
{
    use DatabaseTransactions;
    use UserTrait;
    use AdminEndpointHelpers;

    private const string ADMIN_URL = '/api/v1/admin/facility';
    private const string ADMIN_LIST_URL = '/api/v1/admin/facility/list';
    private const string LIST_URL = '/api/v1/system/facility/list';
    private const string ICON_URL = '/api/v1/system/facility/%s/icon';

    private const string SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>';
    private const string OTHER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"/>';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepareAdminUser();
    }

    private function createFacility(?string $iconSvg = null): Facility
    {
        /** @var Facility $facility */
        $facility = Facility::factory()->create(['icon_svg' => $iconSvg]);
        $this->prepareAdminUser($facility);
        return $facility;
    }

    private function listEntry(string $url, Facility $facility): array
    {
        return collect($this->get($url)->assertOk()->json('data'))->firstWhere('id', $facility->id);
    }

    public function testIconIsSetChangedAndRemoved(): void
    {
        $facility = $this->createFacility();
        $url = self::ADMIN_URL . "/$facility->id";
        self::assertNull($this->listEntry(self::LIST_URL, $facility)['iconHash']);
        self::assertNull($this->listEntry(self::ADMIN_LIST_URL, $facility)['iconSvg']);

        $this->patch($url, ['iconSvg' => self::SVG])->assertOk();
        self::assertSame(self::SVG, $this->listEntry(self::ADMIN_LIST_URL, $facility)['iconSvg']);
        $hash = $this->listEntry(self::LIST_URL, $facility)['iconHash'];
        self::assertNotNull($hash);
        self::assertArrayNotHasKey('iconSvg', $this->listEntry(self::LIST_URL, $facility));

        // A patch without the field leaves the icon alone.
        $this->patch($url, ['name' => 'Other name'])->assertOk();
        self::assertSame($hash, $this->listEntry(self::LIST_URL, $facility)['iconHash']);

        $this->patch($url, ['iconSvg' => self::OTHER_SVG])->assertOk();
        $otherHash = $this->listEntry(self::LIST_URL, $facility)['iconHash'];
        self::assertNotNull($otherHash);
        self::assertNotSame($hash, $otherHash);

        $this->patch($url, ['iconSvg' => null])->assertOk();
        self::assertNull($this->listEntry(self::LIST_URL, $facility)['iconHash']);
    }

    public function testIconIsSetOnCreate(): void
    {
        $result = $this->post(self::ADMIN_URL, ['name' => 'With icon', 'url' => 'with-icon', 'iconSvg' => self::SVG]);
        $result->assertCreated();
        self::assertSame(self::SVG, Facility::query()->findOrFail($result->json('data.id'))->icon_svg);
    }

    public static function validIconProvider(): array
    {
        $svgNamespace = 'xmlns="http://www.w3.org/2000/svg"';
        $comment = fn(int $svgLength) => '<!--' . str_repeat('x', $svgLength - strlen("<svg $svgNamespace></svg>") - 7)
            . '-->';
        return [
            'xml declaration' => ['<?xml version="1.0" encoding="UTF-8"?>' . "\n" . self::SVG],
            'document type naming the DTD' => [
                '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
                . "\n<svg $svgNamespace/>",
            ],
            'the longest allowed' => ["<svg $svgNamespace>" . $comment(Facility::ICON_SVG_MAX_LENGTH) . '</svg>'],
            'non-ASCII characters' => ["<svg $svgNamespace><title>Zażółć gęślą jaźń</title></svg>"],
        ];
    }

    #[DataProvider('validIconProvider')]
    public function testValidIconIsAccepted(string $iconSvg): void
    {
        $facility = $this->createFacility();
        $this->patch(self::ADMIN_URL . "/$facility->id", ['iconSvg' => $iconSvg])->assertOk();
        self::assertSame($iconSvg, $facility->refresh()->icon_svg);
        self::assertSame($iconSvg, $this->get(sprintf(self::ICON_URL, $facility->id))->assertOk()->getContent());
    }

    public static function invalidIconProvider(): array
    {
        $svgNamespace = 'xmlns="http://www.w3.org/2000/svg"';
        return [
            'not xml' => ['just text', 'validation.custom.svg_is_valid'],
            'malformed xml' => ["<svg $svgNamespace><rect></svg>", 'validation.custom.svg_is_valid'],
            'other root element' => ['<html xmlns="http://www.w3.org/1999/xhtml"/>', 'validation.custom.svg_is_valid'],
            'no namespace' => ['<svg viewBox="0 0 1 1"/>', 'validation.custom.svg_is_valid'],
            'document type with entities' => [
                "<!DOCTYPE svg [<!ENTITY e \"x\">]><svg $svgNamespace>&e;</svg>",
                'validation.custom.svg_is_valid',
            ],
            'too long' => [
                "<svg $svgNamespace><!--" . str_repeat('x', Facility::ICON_SVG_MAX_LENGTH - 44) . '--></svg>',
                'validation.max.string',
            ],
            'not trimmed' => [' ' . self::SVG, 'validation.custom.trimmed'],
        ];
    }

    #[DataProvider('invalidIconProvider')]
    public function testInvalidIconIsRejected(string $iconSvg, string $code): void
    {
        $facility = $this->createFacility(self::SVG);
        $result = $this->patch(self::ADMIN_URL . "/$facility->id", ['iconSvg' => $iconSvg]);
        $result->assertBadRequest();
        self::assertContains($code, $this->fieldCodes($result, 'iconSvg'));
        self::assertSame(self::SVG, $facility->refresh()->icon_svg);
    }

    public function testIconEndpointNeedsNoLogin(): void
    {
        $facility = $this->createFacility(self::SVG);
        $facilityWithoutIcon = $this->createFacility();
        PermissionMiddleware::setPermissions(null);

        $result = $this->get(sprintf(self::ICON_URL, $facility->id));
        $result->assertOk();
        self::assertSame(self::SVG, $result->getContent());
        self::assertStringStartsWith('image/svg+xml', $result->headers->get('Content-Type'));
        self::assertStringStartsWith('sandbox;', $result->headers->get('Content-Security-Policy'));
        self::assertSame('nosniff', $result->headers->get('X-Content-Type-Options'));
        self::assertStringContainsString('no-cache', $result->headers->get('Cache-Control'));

        // Only the URL with the hash of the icon may be cached for long.
        $hash = $facility->iconHash();
        foreach (["$hash" => true, "{$hash}0" => false] as $urlHash => $cached) {
            PermissionMiddleware::setPermissions(null);
            $result = $this->get(sprintf(self::ICON_URL, $facility->id) . "?h=$urlHash")->assertOk();
            self::assertSame(self::SVG, $result->getContent());
            $cacheControl = $result->headers->get('Cache-Control');
            self::assertStringContainsString('private', $cacheControl);
            foreach (['immutable', 'max-age=31536000'] as $directive) {
                self::assertSame($cached, str_contains($cacheControl, $directive));
            }
            self::assertSame(!$cached, str_contains($cacheControl, 'no-cache'));
        }

        PermissionMiddleware::setPermissions(null);
        $this->get(sprintf(self::ICON_URL, $facilityWithoutIcon->id))->assertNotFound();
        PermissionMiddleware::setPermissions(null);
        $this->get(sprintf(self::ICON_URL, '00000000-0000-4000-8000-000000000000'))->assertNotFound();
    }
}
