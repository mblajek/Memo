W pliku `routes/web.php` są wpisy typu:
```php
Route::get('/', function () {
    return view('welcome');
});
```
Czyli request http://localhost:9081/ wyświetla template `resources/views/welcome.blade.php`

Template może dostać dane z php, ale to w swoim czasie

Z istotnych rzeczy, to Template'y Blade mogą:
- zawierać przez @include
- rozszerzać przez @extend
- wciągać skompilowane resource'y przez @vite

Przydatne linki:
- laravel+vite: https://laravel.com/docs/10.x/vite
- laravel+blade: https://laravel.com/docs/10.x/blade

Najprawdopodobniej powinien istnieć bazowy template `base.blade.php`, który będzie się składał z kilku,
typu `modules/page-top.blade.php` czy `modules/side-menu.blade.php`. Ten template będzie miał sekcję (jakkolwiek się je
robi), coś typu `page-contents` która będzie zastępowana przez standardowe teplate'y typu `calendar.blade.php`
czy `home.blade.php`.
