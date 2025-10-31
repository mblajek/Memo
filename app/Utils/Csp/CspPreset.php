<?php

namespace App\Utils\Csp;

use Illuminate\Support\Facades\App;
use Spatie\Csp\Directive;
use Spatie\Csp\Keyword;
use Spatie\Csp\Policy;
use Spatie\Csp\Preset;

class CspPreset implements Preset
{
    public function configure(Policy $policy): void
    {
        $policy
            ->add(Directive::FRAME_ANCESTORS, Keyword::NONE)
            ->add(Directive::IMG, 'data:')
            ->add(Directive::OBJECT, Keyword::SELF);

        // Firefox reports CSP violation originating from the toast library. The reason for this
        // problem is unknown. // TODO: Investigate and find a different fix.
        $policy->add(Directive::STYLE, Keyword::UNSAFE_INLINE);
        $policy->add(Directive::STYLE_ATTR, [
            Keyword::UNSAFE_HASHES,
            'sha256-X+zrZv/IbzjZUnhsbWlsecLbwjndTpG0ZynXOif7V+k=',
            'sha256-a4ayc/80/OGda4BO/1o/V0etpOqiLx1JwB5S3beHW0s=',
            'sha256-GVgeJ9587QD/HOULIEfnpWfHaxy666vl7wP3wwF7tbc=',
            'sha256-eF8+x+sy8wuQzQ/PNlfTiLX/Qpfy+XFv9m6bacBd3Qk='
        ]);


        if (App::hasDebugModeEnabled()) {
            $policy->add(Directive::CONNECT, '*');
        } else {
            $policy->add(Directive::UPGRADE_INSECURE_REQUESTS, '');
        }
    }
}
