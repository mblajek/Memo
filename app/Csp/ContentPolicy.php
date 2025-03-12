<?php

namespace App\Csp;

use App;
use Spatie\Csp\Directive;
use Spatie\Csp\Policies\Basic;

class ContentPolicy extends Basic
{
    public function configure()
    {
        parent::configure();

        $this->addDirective(Directive::FRAME_ANCESTORS,'none');
        $this->addDirective(Directive::UPGRADE_INSECURE_REQUESTS, '');
        $this->addDirective(Directive::STYLE, ['fonts.googleapis.com', 'fonts.gstatic.com']);
        $this->addDirective(Directive::FONT, ['fonts.googleapis.com', 'fonts.gstatic.com']);
        $this->addDirective(Directive::IMG, 'data:');

        if (App::hasDebugModeEnabled()) {
            $this->addDirective(Directive::CONNECT, '*');
        }
    }
}
