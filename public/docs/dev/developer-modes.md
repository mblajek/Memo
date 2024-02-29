# Developer modes

A couple of different developer modes coexist in the app.

## The developer permission

A global admin user can grant to themselves the _developer_ permission for the duration of the current session.
With this permission, the backend allows the user to execute some of the developer-specific API calls.

The developer permission is obtained by executing `developerLogin(true)` in the browser console, and revoked
by `developerLogin(false)`.

The permission is visible in the user menu (⋯ next to the user name) as the text _Has developer permission_.

This mode can be enabled on any environment, including production.

## SolidJS DEV

This is the `DEV` mode caused by running vite and SolidJS in the dev mode. It is only possible in the development environment.
The `DEV` mode affects some behaviours of the app, e.g. the availability of some debug tools.

`DEV` is a constant imported from _solid-js_.

## DEV mode of the UI

This DEV mode can be toggled via a checkbox in the user menu (⋯ next to the user name) whenever the app runs
in SolidJS DEV mode (see above), or the developer permission is granted (see above).

The DEV mode directly controls some areas of the app, e.g. only in the DEV mode:

- navigation shows some DEV pages (attributes, dictionaries etc.)
- tables show unconfigured tquery columns
- some system data is editable
- missing translations are more verbose
- etc.

The DEV mode is initially active in the SolidJS `DEV` mode. It is also activated when obtaining the developer permission.
