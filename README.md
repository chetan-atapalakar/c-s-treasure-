# CüS Treasure

**BUILD WEALTH. TRACK PROGRESS. OWN TOMORROW.**
Designed by Chetan Atapalakar.

A personal finance app: accounts, transactions, transfers, budgets, savings goals,
recurring items, analytics and insights. React + Vite on the front end, Supabase
(Postgres + Auth + row-level security) as the backend.

All figures are entered by you. There is **no bank connection**.

## 1. Set up Supabase
1. Create a project at supabase.com.
2. Open **SQL Editor**, paste all of `database/schema.sql` and run it once (Postgres 15+).
3. **Authentication → URL Configuration**: set *Site URL* to your site, and add these
   redirect URLs: `http://localhost:5173/**` and your production URL followed by `/**`.
4. **Authentication → Providers → Email**: decide whether "Confirm email" is on.
   If on, new users verify by email before logging in.
5. **Project Settings → API**: copy the Project URL and the `anon` public key.

## 2. Run locally
```bash
npm install
cp .env.example .env     # then fill in the two values
npm run dev              # http://localhost:5173
```

### Environment variables
| Name | Where | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env` / Vercel | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` / Vercel | Public anon key only |

Never put the `service_role` key in any `VITE_` variable. Everything is protected by
row-level security, so the anon key is safe to expose.

## 3. Commands
```bash
npm run dev       # development server
npm run lint      # ESLint
npm test          # Vitest unit tests (tests/*.test.js)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

## 4. Deploy to Vercel
1. Push the repo to GitHub and import it in Vercel (framework: Vite).
2. Add the two environment variables above.
3. Deploy. `vercel.json` already handles SPA routing and security headers.
4. Add the Vercel URL to Supabase redirect URLs (step 1.3), or password-reset and
   verification links will fail.

## 5. How it works
- **Balances are derived**, never stored: opening balance + income − expenses ± transfers
  (`account_balances` view). Nothing is "deducted" in code, so nothing can double-count.
- **Liabilities** (credit cards, loans) are stored as negative opening balances.
- **Isolation**: every table has row-level security (`user_id = auth.uid()`), and composite
  foreign keys stop a record from pointing at another user's account or category.
- **Recurring items** post through the `run_due_recurring()` database function, atomically,
  once per date (a unique index blocks duplicates). It runs when the app opens and when
  you create or resume a recurring item.
- **Pages** are discovered from `src/pages/*.jsx`; routes and navigation come from
  `src/utils/navigation.js`.

## 6. Tests
`tests/` covers validation, money maths, budget/goal/recurring calculations, analytics
series, insight rules and CSV export. Run `npm test`. Database policies and the auth flow
can only be verified against a live Supabase project, so test them there:
1. Register two users; confirm neither can see the other's data.
2. Create an account, transaction and transfer; check balances on the Accounts page.
3. Create a budget and overspend it; check the alert and bell notification.
4. Create a recurring item due today; reload and confirm it posted once.
5. Export data, change password, then delete a test account.

## 7. Known limitations
- No bank or payment-provider integration. All data is manual.
- The currency setting changes display only; amounts are never converted.
- Goal savings are tracked separately from account balances.
- A recurring monthly item anchored on the 29th–31st moves to the shorter month's end.
- Analytics and Insights load your whole transaction history, which suits personal use.
- Email verification and password-reset emails use Supabase's built-in mailer, which is
  rate-limited. Configure custom SMTP in Supabase for production.