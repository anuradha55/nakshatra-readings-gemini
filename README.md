# Nakshatra Readings — Next.js + Razorpay + PostgreSQL

This version stores every booking in PostgreSQL and marks it `PAID` only after server-side Razorpay signature verification.

## Architecture

Customer → Next.js booking form → `/api/create-order` → Razorpay → `/api/verify-payment` → PostgreSQL

## 1. Create a Neon PostgreSQL database

Create a PostgreSQL database in Neon and copy its connection string. Prisma supports Neon/serverless PostgreSQL; use the connection string provided by Neon. See Prisma's PostgreSQL/Neon guidance.

Set it in `.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
```

Never expose `RAZORPAY_KEY_SECRET` or `DATABASE_URL` to client-side code.

## 2. Install dependencies

```bash
npm install
```

## 3. Generate Prisma Client

```bash
npm run db:generate
```

## 4. Create the database table

For local development:

```bash
npm run db:migrate -- --name init
```

For production after migrations have been committed:

```bash
npm run db:deploy
```

The `Booking` table contains:

- customer name, phone and email
- service selected
- birth date/time/place text
- amount/currency
- Razorpay order ID
- Razorpay payment ID
- booking/payment status
- payment verification timestamp
- created/updated timestamps

## 5. Run

```bash
npm run dev
```

## Payment lifecycle

1. Customer submits booking details.
2. Next.js creates a Razorpay order.
3. A `PENDING` booking is stored with the Razorpay order ID.
4. Customer completes Razorpay Checkout.
5. Browser sends Razorpay IDs/signature plus the server-created booking ID to `/api/verify-payment`.
6. Server independently calculates and checks the Razorpay HMAC signature.
7. Server verifies the order belongs to the booking.
8. The booking changes from `PENDING` to `PAID` and stores the payment ID/time.
9. Repeated verification of the same payment is handled idempotently.

## Important production improvement

For a production payment system, add a Razorpay webhook as a second source of truth. The browser can close or lose connectivity immediately after payment; a webhook lets the server reconcile payment status even when the browser never reaches `/api/verify-payment`.

The partner split/settlement should also be implemented server-side after payment verification using the Razorpay account/route mechanism applicable to your account and partner setup. Do not calculate or trust the split in React.


## Free AI Prediction

The site includes a free AI prediction feature with two questions per email by default. Predictions are stored in PostgreSQL. Configure `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-5.6-luna`) and `AI_FREE_QUESTIONS`. The server calls the Gemini API; the API key is never exposed to the browser. The feature deliberately does not claim that the language model has calculated an exact Kundli. For exact Vedic chart calculations, add a dedicated ephemeris/astrology calculation engine and pass its calculated chart data to the AI for interpretation.
