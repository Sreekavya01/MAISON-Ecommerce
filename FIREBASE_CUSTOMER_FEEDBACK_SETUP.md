# MAISON Customer Feedback deployment

## Firebase plan requirement

This feature uses second-generation Cloud Functions and one Cloud Scheduler job.
Firebase currently requires the **Blaze (pay-as-you-go) plan** to deploy Cloud
Functions. Scheduled functions are billed through Cloud Scheduler; Google notes
that each job is currently USD $0.10 per month and that three jobs per Google
account are available at no charge. Confirm current pricing before deployment:

- https://firebase.google.com/docs/functions/get-started
- https://firebase.google.com/docs/functions/schedule-functions
- https://firebase.google.com/pricing

The repository cannot reveal the Firebase project's active billing plan. Verify
that the project is on Blaze in Firebase Console → Project settings → Usage and
billing. Configure a billing budget/alert before deploying.

## What is deployed

- `scheduleOrderFeedbackEmail`: Firestore trigger that queues feedback exactly
  when an order first changes to `Delivered`.
- `sendDueFeedbackEmails`: one backend scheduler job that runs every 30 minutes,
  sends queue items that became due after two days, and retries transient errors.
- Firestore rules for verified, one-review-per-order customer submissions.
- The existing MAISON email service endpoint remains responsible for sending
  through the existing Resend integration.

The scheduled sender re-reads the order before every send. It skips the email if
the order is no longer delivered, if a review already exists, or if the customer
email is missing. Queue claims have a lease and email sends use a deterministic
idempotency key.

## Environment

Optionally copy `functions/.env.example` to `functions/.env` and set the public
MAISON storefront URL:

```text
MAISON_SITE_URL=https://www.your-maison-domain.example
```

If omitted, feedback links use the Firebase Hosting `web.app` domain for the
active project.

## Deploy

1. Sign in with Firebase CLI and select the production project.
2. Confirm Blaze billing and enable the Cloud Scheduler API.
3. From the repository root, run:

```powershell
./functions/node_modules/.bin/firebase.cmd deploy --only "functions:scheduleOrderFeedbackEmail,functions:sendDueFeedbackEmails,firestore:rules"
```

Deploy the updated storefront using the project's normal hosting workflow.

## Production verification

1. Mark a test customer's order as `Delivered` in Admin → Orders.
2. Confirm `feedbackEmailQueue/<orderId>` is created with a `scheduledFor` value
   two days in the future and the order records `feedbackEmailStatus: scheduled`.
3. For an immediate staging test only, move `scheduledFor` into the past and run
   the scheduler from Google Cloud Console.
4. Confirm the email button opens Account → Orders for the matching order.
5. Submit a 1–5 star review and confirm `customerReviews/<orderId>` is created.
6. Attempting a second submission must be rejected, and another signed-in user
   must not be able to read or review that order.
7. Confirm the review appears in Admin → Customer Reviews and can be published,
   hidden, or deleted.
