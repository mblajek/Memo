<?php

namespace App\Services\User;

use App\Exceptions\ApiException;
use App\Exceptions\ExceptionFactory;
use App\Exceptions\FatalExceptionFactory;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use JsonException;
use Throwable;

class StorageService
{
    /** @throws JsonException */
    private function getUserStorage(User $user): array
    {
        return json_decode(
            DB::table('users')->find($user->id, 'storage')->storage ?? '[]',
            associative: true,
            flags: JSON_THROW_ON_ERROR,
        );
    }

    private function setUserStorage(User $user, array $storage): void
    {
        DB::table('users')->where('id', $user->id)->update([
            'storage' => json_encode($storage),
        ]);
    }

    private function getStorageKey(array $storage, string $key): JsonResponse
    {
        return new JsonResponse(
            ($key === '')
                ? json_encode(array_keys($storage))
                : ($storage[$key] ?? 'null'),
            json: true,
        );
    }

    /** @throws ApiException */
    public function put(User $user, string $key, string $contents): JsonResponse
    {
        try {
            $data = json_decode($contents, flags: JSON_THROW_ON_ERROR);
            $storage = $this->getUserStorage($user);
            if ($data === null) {
                unset($storage[$key]);
            } else {
                $storage[$key] = $contents;
            }
            $this->setUserStorage($user, $storage);
            return $this->getStorageKey($storage, '');
        } catch (Throwable) {
            ExceptionFactory::validation()->throw();
        }
    }

    public function get(User $user, string $key): JsonResponse
    {
        try {
            return $this->getStorageKey($this->getUserStorage($user), $key);
        } catch (Throwable) {
            FatalExceptionFactory::unexpected()->throw();
        }
    }
}
