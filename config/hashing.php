<?php

use Illuminate\Support\Env;

return [
    'driver' => 'bcrypt',
    'bcrypt' => [
        'rounds' => Env::get('BCRYPT_ROUNDS', 13),
        'verify' => true, // change may be needed on driver/algorithm change
    ],
    'rehash_on_login' => true,
];
