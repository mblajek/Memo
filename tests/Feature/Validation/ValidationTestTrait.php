<?php

namespace Tests\Feature\Validation;

use App\Exceptions\ValidationExceptionRenderer;
use App\Rules\Valid;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

trait ValidationTestTrait
{
    private function failed(
        array $rule,
        bool|float|int|string|array|null $data,
        bool $reset = true,
    ): array {
        if ($reset) {
            Valid::reset();
        }

        $validator = Validator::make(
            is_array($data) ? $data : ['f' => $data],
            array_is_list($rule) ? ['f' => $rule] : $rule,
        );

        $errorCodes = [];
        try {
        //    $validator->passes();

            $validator->validate();
        } catch (ValidationException $validationException) {
           // return [];
            $renderer = new ValidationExceptionRenderer($validationException);

            foreach ($renderer->render()->getData(assoc: true)['errors'] as $error) {
                if (array_key_exists('field', $error)) {
                    $validationCode = $error['code'];
                    $code = str_replace('validation.', '', $validationCode);
                    self::assertSame($validationCode, "validation.$code");

                    if ($error['field'] !== 'f') {
                        $code = "{$error['field']},$code";
                    }
                    foreach ($error['data'] ?? [] as $key => $value) {
                        $value = is_array($value) ? implode(',', $value) : $value;
                        $code .= ",$key:$value";
                    }
                    $errorCodes[] = $code;
                }
            }
            sort($errorCodes, SORT_STRING);
        } catch (\Throwable $e) {
            dump($e);
            /*echo $e->
            echo $e->getTraceAsString();*/
            //      throw $e;
            die;
        }

        return $errorCodes;
    }
}
