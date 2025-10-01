<!DOCTYPE html>
@php
    use App\Exceptions\ApiExceptionInterface;
    use Illuminate\Support\Facades\View;
    use Illuminate\Support\Facades\Vite;
    use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

    /** @var HttpExceptionInterface|ApiExceptionInterface $exception */
    $title = ($exception instanceof ApiExceptionInterface)
        ? trans($exception->errorCode) : View::yieldContent('title');
@endphp
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style nonce="{{ Vite::cspNonce() }}">
        body {
            overflow: hidden;
            margin: 0;
            font-family: ui-sans-serif, system-ui, Roboto, Arial, sans-serif;
        }

        body > div {
            width: 100dvw;
            height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3rem;
        }

        body > div > div {
            align-items: center;
            justify-items: center;
        }

        body > div > div > div {
            font-size: 1.3em;
            color: #678;
            font-variant-caps: small-caps;
            display: flex;
            align-items: center;
            gap: 1em;
        }

        body > div > div > div > div:nth-child(2) {
            height: 2em;
            border-left: 1px solid #9ab
        }

        a {
            font-size: 1.1em;
            color: #09b;
        }
    </style>
</head>
<body>
<div>
    <div>
        <div>
            <div>{{ $exception->getStatusCode() }}</div>
            <div></div>
            <div>{{ $title }}</div>
        </div>
    </div>
    <a href="/">{{ url('/') }}/</a>
</div>
</body>
</html>
