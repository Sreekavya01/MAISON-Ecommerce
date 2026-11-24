# MAISON Admin Notifications (Firebase Spark)

The notification system uses only Firebase Authentication, Cloud Firestore,
and browser SDK writes. It does not deploy Cloud Functions and does not require
Blaze billing.

## How notification creation works

Every customer action writes its source record and a deterministic
`adminNotifications` record in the same Firestore batch or transaction. This
provides three important guarantees:

- the source event and its notification either both succeed or both fail;
- Firestore Rules can validate the source with `getAfter()`;
- a deterministic notification document ID prevents duplicates.

The following events are covered:

- new customer registration;
- new order creation;
- new quotation request;
- new bulk order request;
- new return or replacement request;
- new contact message;
- quotation acceptance;
- quotation rejection.

## Deployment

Authenticate the Firebase CLI and deploy only Firestore configuration:

```powershell
.\functions\node_modules\.bin\firebase.cmd login
.\functions\node_modules\.bin\firebase.cmd deploy --only firestore:rules,firestore:indexes --project maison-ecommerce-d75bd
```

The `functions` directory is not referenced by `firebase.json` and is not part
of deployment. It may be removed after any useful local tooling has been
migrated.

## Verification

Use separate customer and administrator browser sessions. Perform a customer
action and confirm that:

1. the source record and one deterministic record appear in Firestore;
2. the Orders and Notifications sidebar badges update without a refresh;
3. the notification appears under All and Unread;
4. clicking it marks it read and opens or highlights the related admin record;
5. the unread badges decrease immediately;
6. repeating normal page reads or refreshing does not create duplicates.

Only administrators may read, mark as read, or delete notifications. A
customer or anonymous browser may create a notification only in the same
atomic write as a strictly validated source event.
