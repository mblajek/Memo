<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0">
  </head>
  <body class="antialiased overflow-hidden">
    <div id="root" class="w-dvw h-dvh"></div>
    @vite('resources/js/index.tsx')
  </body>
</html>
