# Human-friendly Permissions UX

Permission codes remain stable security contracts, but are no longer the
primary labels shown to users.

The Roles form displays:

1. Human-readable permission name.
2. Short explanation.
3. Allowed / Not allowed state.
4. Technical PermissionCode only as secondary traceability text.

All 20 permissions have Spanish and English labels/descriptions.

Security is unchanged: Services continue checking canonical PermissionCode
values. The UI translation never changes the code persisted or authorized.

MAOBITS Room teaching flow:

Human concept -> Friendly label -> PermissionCode -> Service authorization
-> Protected action.
