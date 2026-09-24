# Mobile Forms, Safe Areas and Keyboard Contract

## Shared solution

`Screen` and `ModalSheet` are the single mobile-form assembly pieces.
They provide safe-area spacing, keyboard avoidance and scroll behavior.
The bottom tab bar derives its height from the device bottom inset and hides
while the software keyboard is open.

## Customer form

Create/edit exposes name, document, phone, email, address and notes, matching
the existing domain service instead of a reduced one-field UI.

## Category icon form

Category creation uses `IconPicker`: visual selection, selected-state preview
and accessible buttons. Users never need to type Ionicons internal names.

## MAOBITS Room

Teach this as: device insets -> shared primitive -> form -> module screen.
Do not repeat keyboard/safe-area fixes independently in every module.
