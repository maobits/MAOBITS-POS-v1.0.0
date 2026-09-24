# Checkpoint 25 — User avatars and horizontal login selector

## User avatar

Users now have an optional local avatar stored in `users.avatar_uri`.

The avatar is managed from Users using the existing `USERS_MANAGE`
permission.

The image workflow follows the same local-first contract used by product and
supplier media:

1. operator selects an image with Expo Image Picker;
2. the selected image is cropped to a square;
3. MAOBITS POS copies it into app-owned local media storage;
4. SQLite stores only the resulting local URI;
5. replacing/removing the avatar cleans up the previous app-owned file.

If no avatar exists, the existing initials-based Avatar remains the fallback.

## Login presentation

The login screen no longer stacks users vertically.

Users are displayed as compact horizontal identity cards containing:

- avatar;
- user name;
- role;
- selected-state indicator.

The selector uses a horizontal React Native ScrollView, so many users can be
browsed with touch/drag and horizontal scrolling/trackpad behavior without
making the login form excessively tall.

## Session

The authenticated `SessionUser` now includes:

`avatarUri: string | null`

This keeps the avatar available for future authenticated headers/profile UI
without another database lookup.

## Backup / restore

User avatar media is included in the existing MAOBITS POS backup payload and
its URI is remapped during restore, just like product and supplier images.

Old backups remain valid because `avatar_uri` is optional and missing columns
use SQLite's NULL default after migration 007.
