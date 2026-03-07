# Stripe Payment Integration - Setup Guide

## Overview
This property management system now includes full Stripe payment processing capabilities, allowing you to:
- Accept rent payments via card or ACH
- Generate payment links for tenants
- Track all payments with detailed transaction history
- View payment analytics and statistics
- Handle webhooks for automatic payment updates

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Backend Configuration](#backend-configuration)
4. [Frontend Configuration](#frontend-configuration)
5. [Webhook Setup](#webhook-setup)
6. [Testing](#testing)
7. [Going Live](#going-live)
8. [Features Overview](#features-overview)

---

## Prerequisites

- Node.js installed (v14 or higher)
- A Stripe account (free to create)
- Backend and frontend running locally

---

## Stripe Account Setup

### 1. Create a Stripe Account
1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Create your account
3. Complete business verification (can skip for testing)

### 2. Get Your API Keys
1. Navigate to [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - Click "Reveal test key"

⚠️ **Never commit your secret key to version control!**

---

## Backend Configuration

### 1. Update Environment Variables

Edit `/backend/.env` and add your Stripe keys:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe URLs (update for production)
STRIPE_SUCCESS_URL=http://localhost:5173/payments/success
STRIPE_CANCEL_URL=http://localhost:5173/payments/cancel
```

### 2. Install Dependencies (Already Done)
```bash
cd backend
npm install
```

### 3. Start the Backend
```bash
cd backend
node server.js
```

You should see:
```
🚀 Property Manager Backend v2.0.0 running on http://localhost:3001
💳 Stripe Integration:
   • ACH payments (0.8% fee)
   • Card payments (2.9% + $0.30 fee)
   • Webhook support for payment events
   • Payment tracking in CSV
```

---

## Frontend Configuration

### 1. Verify API Client
The frontend API client (`dashboard/src/lib/api.ts`) is already configured with payment methods.

### 2. Start the Frontend
```bash
cd dashboard
npm run dev
# or
bun dev
```

---

## Webhook Setup

Webhooks allow Stripe to notify your system when payments are completed or failed.

### For Development (Using Stripe CLI)

1. **Install Stripe CLI**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe CLI**
   ```bash
   stripe login
   ```

3. **Forward Webhooks to Local Server**
   ```bash
   stripe listen --forward-to localhost:3001/api/payments/webhook
   ```

4. **Copy the Webhook Secret**
   The CLI will display a webhook signing secret (starts with `whsec_`).
   Add it to your `.env` file:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

### For Production

1. Go to [Stripe Webhooks Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your server URL: `https://yourdomain.com/api/payments/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Copy the "Signing secret" and add to production `.env`

---

## Testing

### Test Cards

Stripe provides test cards for development:

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Payment declined |
| `4000 0025 0000 3155` | Requires authentication |

Use any future expiration date and any 3-digit CVC.

### Testing Payment Flow

1. **Navigate to Tenants Page** (`http://localhost:5173/tenants`)
2. Click "Send Payment Link" for any tenant
3. The payment link is copied to your clipboard
4. Open the link in a new browser tab
5. Enter test card information
6. Complete the payment
7. Verify payment appears in:
   - Payments page (`/payments`)
   - `tracking/payments.csv`
   - Dashboard stats

### Testing ACH Payments

1. In checkout, select "ACH Direct Debit"
2. Use test account numbers:
   - Routing: `110000000`
   - Account: `000123456789`

---

## Going Live

### 1. Switch to Live Keys

1. Get live API keys from [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Update production `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
   ```

### 2. Update URLs
```bash
STRIPE_SUCCESS_URL=https://yourdomain.com/payments/success
STRIPE_CANCEL_URL=https://yourdomain.com/payments/cancel
```

### 3. Complete Stripe Onboarding
- Verify business details
- Connect bank account for payouts
- Enable payment methods (cards, ACH)

### 4. Set Up Production Webhook
Follow the [Production Webhook Setup](#for-production) steps above.

---

## Features Overview

### 1. **Payments Dashboard** (`/payments`)
- View all payment transactions
- Filter by status, payment method, tenant, or property
- Export to CSV
- Real-time statistics:
  - Total revenue
  - Net revenue (after fees)
  - Pending payments
  - Payment method breakdown

### 2. **Payment Checkout Component**
- Creates Stripe Checkout sessions
- Calculates fees automatically:
  - Card: 2.9% + $0.30
  - ACH: 0.8%
- Supports rent, deposits, and late fees
- Mobile-friendly payment interface

### 3. **Tenant Payment Portal**
- Tenant-facing payment interface
- Shows current amount due
- Payment history
- Late fee calculations
- One-click payments

### 4. **Send Payment Links** (Tenants Page)
- Generate payment links for any tenant
- Links are shareable via email/SMS
- No login required for tenants
- Secure Stripe-hosted checkout

### 5. **Dashboard Integration**
- Payment stats card showing:
  - Total payments collected
  - Net revenue after fees
  - Number of completed payments

### 6. **Automated Payment Tracking**
All payments are automatically recorded in `tracking/payments.csv`:
```
Payment_ID,Tenant_ID,Property_ID,Amount,Transaction_Fee,Net_Amount,Payment_Method,Status,Stripe_Payment_Intent_ID,Date_Created,Date_Completed,Notes
```

---

## API Endpoints

### Payment Endpoints

```
POST   /api/payments/create-checkout-session
POST   /api/payments/create-payment-link
POST   /api/payments/webhook
GET    /api/payments
GET    /api/payments/tenant/:tenantId
GET    /api/payments/property/:propertyId
GET    /api/payments/stats
```

### Example: Create Checkout Session

```bash
curl -X POST http://localhost:3001/api/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "TEN123",
    "propertyId": "PROP456",
    "amount": 1500,
    "type": "rent",
    "description": "January 2026 rent"
  }'
```

Response:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "paymentId": "PAY789ABC"
}
```

---

## Fee Structure

### Card Payments
- **Rate**: 2.9% + $0.30 per transaction
- **Example**: $1,500 rent = $43.80 fee = $1,456.20 net

### ACH Payments (Recommended)
- **Rate**: 0.8% per transaction
- **Example**: $1,500 rent = $12.00 fee = $1,488.00 net

**Savings**: ACH saves ~2% compared to cards!

---

## Security Best Practices

1. ✅ **Never expose secret keys** - Keep in `.env` only
2. ✅ **Use HTTPS in production** - Required by Stripe
3. ✅ **Verify webhook signatures** - Already implemented
4. ✅ **Keep Stripe packages updated** - Check regularly
5. ✅ **Use raw body parser for webhooks** - Already configured
6. ✅ **Log all payment events** - For audit trails

---

## Troubleshooting

### "Payment failed to create"
- Check that Stripe keys are correct in `.env`
- Verify backend server is running
- Check browser console for errors

### "Webhook signature verification failed"
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Use Stripe CLI for local testing
- Check webhook endpoint URL in Stripe Dashboard

### "Payments not updating after checkout"
- Verify webhook is configured and running
- Check backend logs for webhook errors
- Test webhook with Stripe CLI: `stripe trigger checkout.session.completed`

### CSV file permissions
- Ensure `tracking/payments.csv` exists and is writable
- Check file permissions: `chmod 644 tracking/payments.csv`

---

## Support & Resources

- **Stripe Documentation**: [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe Testing**: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)
- **Stripe Dashboard**: [https://dashboard.stripe.com](https://dashboard.stripe.com)
- **Stripe Support**: Available in your Stripe Dashboard

---

## Next Steps

1. ✅ Configure Stripe API keys
2. ✅ Test payment flow with test cards
3. ✅ Set up webhooks for automatic updates
4. ✅ Test sending payment links to tenants
5. ✅ Verify payment tracking in CSV
6. ⏳ Complete Stripe business verification
7. ⏳ Switch to live mode when ready
8. ⏳ Set up automatic email notifications (future enhancement)

---

**🎉 Congratulations!** Your property management system now has full payment processing capabilities!
