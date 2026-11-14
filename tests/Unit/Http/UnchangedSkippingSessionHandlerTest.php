<?php

namespace Tests\Unit\Http;

use App\Http\Session\UnchangedSkippingSessionHandler;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

class UnchangedSkippingSessionHandlerTest extends TestCase
{
    private const string ID = 'session-id';

    private ArraySessionHandler $storage;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-01-01 12:00:00');
        $this->storage = new ArraySessionHandler(10);
        $this->storage->write(self::ID, 'initial');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** A handler of one request. */
    private function requestHandler(): UnchangedSkippingSessionHandler
    {
        return new UnchangedSkippingSessionHandler($this->storage);
    }

    public function testUnchangedSessionDoesNotUndoChangeOfAnotherRequest(): void
    {
        $long = $this->requestHandler();
        $this->assertSame('initial', $long->read(self::ID));
        $short = $this->requestHandler();
        $short->read(self::ID);
        $this->assertTrue($short->write(self::ID, 'changed'));
        $this->assertTrue($long->write(self::ID, 'initial'));
        $this->assertSame('changed', $this->storage->read(self::ID));
    }

    public function testChangedSessionIsWritten(): void
    {
        $handler = $this->requestHandler();
        $handler->read(self::ID);
        $this->assertTrue($handler->write(self::ID, 'changed'));
        $this->assertSame('changed', $this->storage->read(self::ID));
    }

    public function testSessionNotReadIsWritten(): void
    {
        $handler = $this->requestHandler();
        $this->assertTrue($handler->write('new-id', 'new'));
        $this->assertSame('new', $this->storage->read('new-id'));
    }

    public function testUnchangedSessionRemovedMeanwhileStaysRemoved(): void
    {
        $long = $this->requestHandler();
        $long->read(self::ID);
        $this->storage->destroy(self::ID);
        $this->assertTrue($long->write(self::ID, 'initial'));
        $this->assertSame('', $this->storage->read(self::ID));
    }

    public function testSecondWriteOfSameDataInRequestIsSkipped(): void
    {
        $handler = $this->requestHandler();
        $handler->read(self::ID);
        $handler->write(self::ID, 'changed');
        $this->storage->write(self::ID, 'other');
        $handler->write(self::ID, 'changed');
        $this->assertSame('other', $this->storage->read(self::ID));
    }

    public function testUnchangedSessionHasExpiryRefreshed(): void
    {
        $handler = $this->requestHandler();
        $handler->read(self::ID);
        Carbon::setTestNow(Carbon::now()->addMinutes(6));
        $handler->write(self::ID, 'initial');
        Carbon::setTestNow(Carbon::now()->addMinutes(6));
        $this->assertSame('initial', $this->storage->read(self::ID));
    }

    public function testUnchangedSessionChangedMeanwhileIsNotWritten(): void
    {
        $long = $this->requestHandler();
        $long->read(self::ID);
        $this->storage->write(self::ID, 'changed');
        Carbon::setTestNow(Carbon::now()->addMinutes(6));
        $this->assertTrue($long->write(self::ID, 'initial'));
        // Expired as of the other request's write: nothing was written since.
        Carbon::setTestNow(Carbon::now()->addMinutes(6));
        $this->assertSame('', $this->storage->read(self::ID));
    }

    public function testStoreLeavesSessionNotChangedByRequestAlone(): void
    {
        $id = str_repeat('a', 40);
        $first = new Store('session', $this->requestHandler(), $id);
        $first->start();
        $first->put('key', 'value');
        $first->save();

        $second = new Store('session', $this->requestHandler(), $id);
        $second->start();
        $this->storage->write($id, 'written meanwhile');
        $second->save();
        $this->assertSame('written meanwhile', $this->storage->read($id));
    }
}
