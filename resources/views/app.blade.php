<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body class="antialiased w-screen h-screen overflow-hidden">
    <div id="root" class="min-w-full min-h-full"></div>
    @vite('resources/js/index.tsx')
  </body>
</html>
