# StashInn Platform Test Suite

This directory serves as the central repository for manual and automated test scenarios. It is organized chronologically by development stages to ensure every feature is thoroughly validated before shipping to production.

## Directory Structure
- **[STAGE_1_AUTH.md](./STAGE_1_AUTH.md)**: Tests covering Supabase Authentication, Role-based Routing, and Middleware validation.
- **[STAGE_2_CORE_FLOWS.md](./STAGE_2_CORE_FLOWS.md)**: (Upcoming) Partner onboarding, location management, and booking flows.
- **[STAGE_3_PAYMENTS.md](./STAGE_3_PAYMENTS.md)**: (Upcoming) Razorpay payment integrations and webhooks.

## How to execute tests
1. Ensure the development server is running (`npx turbo run dev`).
2. Have test credentials ready or utilize your local database seed data.
3. Follow the granular step-by-step procedures outlined in the respective Stage's markdown file.
