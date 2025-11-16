<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0">
    @php use Illuminate\Support\Facades\Vite; @endphp
    <meta property="csp-nonce" nonce="{{Vite::cspNonce()}}" content="{{Vite::cspNonce()}}">
    <link rel="icon" href="/favicon.png"/>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Mulish:ital,wght@0,200..1000;1,200..1000&family=PT+Mono&display=swap" rel="stylesheet">
  </head>
  <body class="antialiased overflow-hidden">
    <div id="root" class="w-dvw h-dvh"></div>
    @vite('resources/js/index.tsx')
  </body>
</html>
