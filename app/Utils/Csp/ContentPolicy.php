<?php

namespace App\Utils\Csp;

use App;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
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

        if (App::hasDebugModeEnabled()) {
            $this->addDirective(Directive::CONNECT, '*');
        } else {
            $this->addDirective(Directive::UPGRADE_INSECURE_REQUESTS, '');
        }
    }

    public function shouldBeApplied(Request $request, Response $response): bool
    {
        if (App::hasDebugModeEnabled() &&
                ($response->isClientError() || $response->isServerError() || Vite::isRunningHot())) {
            // Don't apply the policy to the dev error page.
            return false;
        }
        return parent::shouldBeApplied($request, $response);
    }
}
