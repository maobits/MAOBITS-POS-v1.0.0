# Checkpoint 26 — Login safe area and small-screen fit

## Problem

On some Android devices the Login button reached the physical bottom edge and
was partially covered by the system navigation area.

## Fix

The login screen now uses `react-native-safe-area-context` and explicitly
protects both top and bottom edges.

The login form itself is vertically scrollable, so short devices can always
reach:

- user selector;
- PIN pad;
- Login button.

The lower content padding is calculated from the real device inset:

`paddingBottom: insets.bottom + 24`

This keeps the Login action above Android navigation controls.

## Preserved behavior

Checkpoint 26 does not change:

- authentication;
- PIN rules;
- user avatars;
- horizontal user selector;
- roles;
- SQLite;
- session logic.

The change is layout-only.
