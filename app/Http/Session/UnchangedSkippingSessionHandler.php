<?php

namespace App\Http\Session;

use Illuminate\Session\ExistenceAwareInterface;
use SessionHandlerInterface;

/**
 * Writes the session only when the request changed it.
 *
 * The session is written as a whole when a request ends, so a request that started earlier would
 * otherwise replace the session with the outdated copy it read, undoing what a shorter request
 * stored in the meantime. A request that changed nothing only refreshes the expiry, and only if
 * the stored session is still the one it read, which leaves just a short window between that
 * check and the write.
 */
class UnchangedSkippingSessionHandler implements SessionHandlerInterface, ExistenceAwareInterface
{
    /** @var array<string, string> The data as read, by session id. */
    private array $readData = [];

    public function __construct(private readonly SessionHandlerInterface $handler)
    {
    }

    public function open(string $path, string $name): bool
    {
        return $this->handler->open($path, $name);
    }

    public function close(): bool
    {
        return $this->handler->close();
    }

    public function read(string $id): string|false
    {
        $data = $this->handler->read($id);
        if (is_string($data)) {
            $this->readData[$id] = $data;
        } else {
            unset($this->readData[$id]);
        }
        return $data;
    }

    public function write(string $id, string $data): bool
    {
        if (($this->readData[$id] ?? null) !== $data) {
            $this->readData[$id] = $data;
            return $this->handler->write($id, $data);
        }
        // Changed in the meantime, the session has its expiry refreshed already; removed, e.g. by
        // a logout, it stays removed.
        if ($this->handler->read($id) !== $data) {
            return true;
        }
        return $this->handler->write($id, $data);
    }

    public function destroy(string $id): bool
    {
        unset($this->readData[$id]);
        return $this->handler->destroy($id);
    }

    public function gc(int $max_lifetime): int|false
    {
        return $this->handler->gc($max_lifetime);
    }

    public function setExists($value)
    {
        if ($this->handler instanceof ExistenceAwareInterface) {
            $this->handler->setExists($value);
        }
        return $this;
    }
}
