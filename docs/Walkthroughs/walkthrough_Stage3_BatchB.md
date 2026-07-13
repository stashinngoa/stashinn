# Stage 3 — Batch B: Razorpay Webhooks & Earnings Dashboard

Batch B is complete! We have successfully secured the Razorpay integration with Cryptographic Webhooks and built the financial interface for Partners to track their revenue.

---

## 1. Secure Webhooks API
I have created the primary Webhook Listener at `/api/webhooks/razorpay`. 
- **Cryptographic Signatures:** When Razorpay successfully captures a payment, it fires a POST request to this route. The Next.js server uses the built-in Node `crypto` library to hash the raw payload using your `RAZORPAY_WEBHOOK_SECRET` and compares it to the incoming `x-razorpay-signature` header to guarantee the request wasn't forged.
- **Idempotency:** It safely updates the `public.payments` ledger from `pending` to `paid`. It checks the database first to ensure duplicate webhook fires do not cause redundant processing.

## 2. Partner Earnings Dashboard
I have built a brand new **Earnings & Payouts** interface for the Partners, available via the sidebar!
- **Dynamic Aggregation:** The page actively reads from the `partner_transactions` ledger and dynamically calculates:
  - **Net Earnings:** Total lifetime revenue after the 15% platform cut.
  - **Platform Fees:** Total commission the platform has taken (or is owed).
  - **Pending Payouts (Online):** The exact amount of money StashInn holds in its Razorpay account that needs to be wired to the Partner.
  - **Cash Due to Platform:** The exact amount of commission the Partner owes StashInn from cash payments collected at their physical location.
- **Transaction History:** A beautiful, clean table at the bottom itemizes every single transaction, color-coding whether it was an Online payment or Cash at Location.

---

### Verification Checklist
1. Switch over to the Partner App (`localhost:3001`).
2. Notice the new **Earnings & Payouts** tab in the sidebar navigation.
3. Click it and explore the Dashboard! If you completed any test bookings in Batch A, you should see those transactions perfectly categorized in the table, with the 15% commission correctly subtracted from your cut!
