# ByteBattles — Test Credentials

These accounts exist in the **preview/dev** environment only. Use them when validating teacher / admin / student flows.

## Admin (primary account)
- Email: `astapp@spanola.net`
- Password: `AlisaFaith$14`
- Role: `teacher` with `is_admin: true`
- Use for: anything requiring admin (Lesson Manager, Analytics, Password Reset, Help AI admin audience, "Updated X ago" admin badge, etc.)

## Non-admin teacher (for role-gate testing)
- Email: `test.user.1760736702@example.com`
- Password: `Byte-6582-Reset` (temp pw — `must_change_password: true`)
- Role: `teacher` with `is_admin: false`
- Use for: confirming teacher-only flows hide admin-only UI (e.g., the admin "Updated X ago" badge on `/turtle-curriculum` must NOT appear for this user)

## Login endpoint
`POST {REACT_APP_BACKEND_URL}/api/auth/teacher-login` with `{"email": "...", "password": "..."}` → returns `session_token`.

Use `Authorization: Bearer <session_token>` for subsequent requests.
