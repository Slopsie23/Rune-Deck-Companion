# Firebase Security Specification - Rune Deck Companion

## 1. Data Invariants
- A Deck must belong to a valid User.
- A User can only modify their own Profile, Decks, and Deckbox.
- All timestamps must be server-generated.
- String fields must have maximum lengths to prevent resource exhaustion.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Attempt to create a deck for another User ID.
2. **Ghost Field Injection**: Attempt to add `isAdmin: true` to a user profile.
3. **Negative Cost**: Attempt to set `totalCost` to a negative value.
4. **Massive ID**: Attempt to use a 1MB string as a document ID.
5. **PII Leak**: Attempt to read another user's email.
6. **Immutable bypass**: Attempt to change `createdAt` on an existing deck.
7. **Type Mismatch**: Attempt to send a string for a `totalCost` number field.
8. **Orphaned Deck**: Attempt to create a deck with a non-existent `userId`.
9. **State Shortcut**: (N/A for this app as there is no status workflow currently).
10. **Query Scraping**: Attempt to list all decks without a filter on personal `userId`.
11. **Shadow Update**: Attempt to update a deck name and also sneak in a `verified: true` field.
12. **Timestamp Fraud**: Attempt to send a client-side timestamp for `updatedAt`.

## 3. Test Runner (Conceptual)
All the above payloads should return `PERMISSION_DENIED`.
