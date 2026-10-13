<?php

namespace App\Rules;

use Closure;
use DOMDocument;

final class SvgIsValidRule extends AbstractRule
{
    private const string SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && self::isSvg($value)) {
            return;
        }
        $this->validator->addFailure($attribute, 'custom.svg_is_valid');
    }

    private static function isSvg(string $value): bool
    {
        $useInternalErrors = libxml_use_internal_errors(true);
        try {
            $document = new DOMDocument();
            if (!$document->loadXML($value, LIBXML_NONET)) {
                return false;
            }
            // Image editors add a document type naming the SVG DTD. One with an internal subset
            // could define entities, which are not needed in an image.
            if ($document->doctype?->internalSubset !== null) {
                return false;
            }
            $root = $document->documentElement;
            return $root !== null && $root->localName === 'svg' && $root->namespaceURI === self::SVG_NAMESPACE;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($useInternalErrors);
        }
    }
}
