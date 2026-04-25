# Barista App

Barista workflow app, kept separate from the cashier POS.

Current behavior:
- served from `/barista`
- reads live orders from `/api/receipts`
- converts each paid receipt into a barista ticket
- keeps barista status in browser `localStorage`

Suggested next steps:
- persist barista status in the database if multiple devices will share the board
- split mixed receipts into finer-grained prep tickets if needed
- add queue filters such as category, newest, and ready-only
