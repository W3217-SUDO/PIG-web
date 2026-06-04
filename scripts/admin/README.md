# Admin SQL Templates

These templates are for production operations before a GUI admin console exists.

Rules:

- Copy a `.sql.template` file to a private working file before editing values.
- Replace every `TODO_...` placeholder before running.
- Run the preview `SELECT` statements first and keep the result with the ops ticket.
- Use `START TRANSACTION` and only `COMMIT` after the verification `SELECT` output is correct.
- For payment, refund, wallet, and inventory changes, get two-person confirmation before `COMMIT`.

Current templates:

- `new-pig.sql.template`: publish a new pig listing.
- `order-status-adjust.sql.template`: manually adjust an order in exceptional cases.
- `manual-wallet-adjust.sql.template`: owner-approved wallet compensation or correction.
