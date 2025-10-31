<?php

namespace App\Utils\Csp;

use Illuminate\Support\Facades\App;
use Spatie\Csp\Directive;
use Spatie\Csp\Keyword;
use Spatie\Csp\Policy;
use Spatie\Csp\Preset;

class CspPreset implements Preset
{
    private const array STYLE_UNSAFE_HASHES = [
        'sha256-NYqDJarbgj8BrDt9c9SCVZ96KOekLHkpVHkkTi7OW4o=',
        'sha256-DEHVuKvTsAFAl1apZgCAMZJPsHH82YsDKDBLdy7wJSo=',
        'sha256-zc3R/9/nOrGYXcWw3GqG8kSUiPQSVq2sL5EDC1mw4Oc=',
        'sha256-nqvFJWr/1jSSenq5XABoZvgJO2nJraCjerZhSWtS1oU=',
        'sha256-/jefX6LiWiVz6n6JT8ZNFjxkLfY5+l9z2szBYOBbgEg=',
        'sha256-NRuk9EmhV4oCLLupvcti9O8lJ98iBkUKL5KDCqnj5Vw=',
        'sha256-PACCo2laKlFRMk8YLd7g5Fq+RjD7KsayOIkbOGDD/gs=',
    ];

    public function configure(Policy $policy): void
    {
        $policy
            ->add(Directive::FRAME_ANCESTORS, Keyword::NONE)
            ->add(Directive::IMG, 'data:')
            ->add(Directive::OBJECT, Keyword::SELF);

        // Firefox reports CSP violation originating from the toast library. The reason for this
        // problem is unknown. // TODO: Investigate and find a different fix.
        $policy->add(Directive::STYLE, Keyword::UNSAFE_INLINE);
        $policy->add(Directive::STYLE_ATTR, [ Keyword::UNSAFE_HASHES, ...self::STYLE_UNSAFE_HASHES]);


        if (App::hasDebugModeEnabled()) {
            $policy->add(Directive::CONNECT, '*');
        } else {
            $policy->add(Directive::UPGRADE_INSECURE_REQUESTS, '');
        }
    }
}
