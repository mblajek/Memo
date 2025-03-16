<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>@yield('code') @yield('title')</title>
    </head>
    <body style="overflow: hidden; margin: 0; font-family: ui-sans-serif, system-ui, Roboto, Arial, sans-serif;">
        <div style="width: 100dvw; height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3rem;">
            <div style="align-items: center; justify-items: center;">
                <div style="font-size: 1.3em; color: #678; font-variant-caps: small-caps; display:flex; align-items: center; gap: 1em;">
                    <div>@yield('code')</div>
                    <div style="height: 2em; border-left: 1px solid #9ab"></div>
                    <div>@yield('message')</div>
                </div>
            </div>
            <a href="/" style="font-size: 1.1em; color: #09b;">{{ url('/') }}/</a>
        </div>
    </body>
</html>
