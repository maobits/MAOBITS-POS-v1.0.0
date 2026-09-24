# Checkpoint 27 — Login PIN label interpolation fix

The MAOBITS POS `t()` helper does not currently interpolate arbitrary
variables passed as a second argument.

Checkpoint 25 used:

`t('...pinForUser', { name })`

which rendered the locale template literally as:

`PIN de {name}`

Checkpoint 27 removes that unsupported interpolation dependency.

The UI now composes the label explicitly:

`PIN de` + selected user name

or in English:

`PIN for` + selected user name

No authentication, PIN validation, avatar, Safe Area or login navigation
behavior changes.
