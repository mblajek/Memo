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
    private function getUserStorage(User $user, bool $forUpdate = false): array
    {
        $query = DB::table('users');
        if ($forUpdate) {
            $query->lockForUpdate();
        }
        return json_decode(
            $query->find($user->id, 'storage')->storage ?? '[]',
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

    private function getStorageKeys(array $storage): JsonResponse
    {
        return new JsonResponse(array_keys($storage));
    }

    private function getStorageByKey(array $storage, string $key): JsonResponse
    {
        return new JsonResponse($storage[$key] ?? 'null', json: true);
    }

    /** @throws ApiException */
    public function put(User $user, string $key, string $contents): JsonResponse
    {
        try {
            $data = json_decode($contents, flags: JSON_THROW_ON_ERROR);
            // the whole map is rewritten, so concurrent puts of other keys must wait
            $storage = DB::transaction(function () use ($user, $key, $contents, $data) {
                $storage = $this->getUserStorage($user, forUpdate: true);
                if ($data === null) {
                    unset($storage[$key]);
                } else {
                    $storage[$key] = $contents;
                }
                $this->setUserStorage($user, $storage);
                return $storage;
            });
            return $this->getStorageKeys($storage);
        } catch (Throwable) {
            ExceptionFactory::validation()->throw();
        }
    }

    public function get(User $user, string $key): JsonResponse
    {
        try {
            $storage = $this->getUserStorage($user);
            return ($key === '') ? $this->getStorageKeys($storage)
                : $this->getStorageByKey($storage, $key);
        } catch (Throwable) {
            FatalExceptionFactory::unexpected()->throw();
        }
    }
}
