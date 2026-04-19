# Security Spec for SecureSpend

## Data Invariants
- A transaction MUST belong to the authenticated user (`userId` match).
- A bill MUST belong to the authenticated user.
- Savings goals are private to the user.
- User profile data (PII) like email must be protected.
- Status fields (e.g., `isSuspicious` in Transaction) should only be modifiable by "system" (simulated by strict rules or admin).
- `createdAt` and `originalOwnerId` are immutable.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create a transaction with `userId` of another user.
2. **PII Breach**: Attempt to read another user's profile document.
3. **Ghost Field Update**: Attempt to update a transaction by adding an `isAdminVerified` field.
4. **State Shortcut**: Attempt to change a bill status from `unpaid` to `paid` without providing the required `paymentMethod` field (if enforced).
5. **Resource Poisoning**: Use a 2MB string as a `description` in a transaction.
6. **Immutable Violation**: Attempt to change the `createdAt` timestamp on an existing document.
7. **Cross-Room Leak**: User A tries to list transactions of User B.
8. **Admin Privilege Escalation**: User tries to set their own `role` to `admin` in the `/users/{userId}` document.
9. **Orphaned Record**: Create a transaction for a non-existent user profile.
10. **Terminal State Break**: Attempt to modify a transaction already marked as `completed`.
11. **Query Scraping**: Attempt a collection group query on transactions without a `userId` filter.
12. **ID Poisoning**: Use a script tag `<script>...</script>` as a document ID.

## Test Runner Design
The tests will ensure `PERMISSION_DENIED` for all above scenarios.
