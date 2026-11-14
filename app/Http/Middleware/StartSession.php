<?php

namespace App\Http\Middleware;

use App\Http\Session\UnchangedSkippingSessionHandler;
use Illuminate\Http\Request;
use Illuminate\Session\CookieSessionHandler;
use Illuminate\Session\Middleware\StartSession as BaseStartSession;

class StartSession extends BaseStartSession
{
    public function getSession(Request $request)
    {
        $session = parent::getSession($request);
        $handler = $session->getHandler();
        // Not the cookie handler: the store gives the request only to a handler of its class.
        if (!($handler instanceof UnchangedSkippingSessionHandler || $handler instanceof CookieSessionHandler)) {
            $session->setHandler(new UnchangedSkippingSessionHandler($handler));
        }
        return $session;
    }

    /**
     * Does not store the URL of the request in the session: nothing uses it, and it would change
     * the session on each GET request, so the session would be written even when nothing else
     * changed.
     */
    protected function storeCurrentUrl(Request $request, $session)
    {
    }
}
