<?php

namespace App\Utils\Csp;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Spatie\Csp\Directive;
use Spatie\Csp\Policies\Basic;
use Symfony\Component\HttpFoundation\Response;

class ContentPolicy extends Basic
{
    public function configure()
    {
        parent::configure();

        $this->addDirective(Directive::FRAME_ANCESTORS, 'none');
        $this->addDirective(Directive::STYLE, ['fonts.googleapis.com', 'fonts.gstatic.com']);
        $this->addDirective(Directive::FONT, ['fonts.googleapis.com', 'fonts.gstatic.com']);
        $this->addDirective(Directive::IMG, 'data:');
        $this->addDirective(Directive::OBJECT, 'self');

        // Firefox reports CSP violation originating from the toast library. The reason for this
        // problem is unknown.
        // TODO: Investigate and find a different fix.
        $this->addDirective(Directive::STYLE_ATTR, [
            'unsafe-hashes',
            'sha256-X+zrZv/IbzjZUnhsbWlsecLbwjndTpG0ZynXOif7V+k=',
            'sha256-a4ayc/80/OGda4BO/1o/V0etpOqiLx1JwB5S3beHW0s=',
            'sha256-GVgeJ9587QD/HOULIEfnpWfHaxy666vl7wP3wwF7tbc=',
            'sha256-eF8+x+sy8wuQzQ/PNlfTiLX/Qpfy+XFv9m6bacBd3Qk=',
        ]);

        if (App::hasDebugModeEnabled()) {
            $this->addDirective(Directive::CONNECT, '*');
        } else {
            $this->addDirective(Directive::UPGRADE_INSECURE_REQUESTS, '');
        }
    }

    public function shouldBeApplied(Request $request, Response $response): bool
    {
        if (App::hasDebugModeEnabled() && ($response->isClientError() || $response->isServerError())) {
            // Don't apply the policy to the dev error page.
            return false;
        }
        return parent::shouldBeApplied($request, $response);
    }
}
