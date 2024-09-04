### Overview

This is a documentation of integrating recurring payments into Jur using the Paymongo API, Firebase for data management, and SvelteKit for frontend and backend API routes. 

The integration follows a custom Payment Intent, Payment Method (PIPM) workflow to handle subscription creation, payment processing, and subscription management.

### 1. Paymongo Subscription Workflow

#### 1.1. **Creating a Plan**

- Begin by defining the subscription plans within Paymongo. Each plan should include details about billing intervals, amounts, and other relevant attributes.

#### 1.2. **Creating a Customer**

- Next, create a customer entity in Paymongo to represent the user. If the customer already exists, reuse their customer ID.

#### 1.3. **Creating a Subscription**

- Link the customer to their selected plan by creating a subscription. The subscription automatically generates an invoice and a payment intent.

#### 1.4. **Creating and Attaching a Payment Method**

- Create a new payment method (currently, only card payments are supported).
- Attach the payment method to the payment intent generated during the subscription creation.
- **Note**: Customers must complete the payment within 24 hours, or the subscription will be automatically canceled by the Paymongo system.

#### 1.5. **Redirecting for 3DS Authentication**

- Redirect customers to the 3D Secure (3DS) authentication page. Upon completion or cancellation, redirect them back to the `/verify` page.
- **Outcome**: Once the first payment is successful, the subscription is activated, and future payments are processed automatically according to the billing schedule.

### 2. Firebase Data Management

#### 2.1. **Recording Subscriptions**

- Upon successfully attaching a customer to a plan in `1.3`, store the subscription details in Firebase under the `/subs` path.

#### 2.2. **Tracking Subscription Status**

- After 3DS authentication, redirect the customer to the `/verify` page, where the Paymongo API is polled to check the subscription status.
- If the subscription is successful, store the complete API response under the `/verified` path in Firebase and update the status to "active".

### 3. Webhook for Redundancy

#### 3.1. **Webhook Setup**

- Configure a webhook to listen for `payment.paid` events from Paymongo.
- Upon receiving such an event, the webhook verifies the transaction by calling the Paymongo API.
- If the subscription is confirmed as successful, store the response in the `/verified` path in Firebase and set the status to "active".

### 4. Subscription Cancellation Workflow

#### 4.1. **Marking for Cancellation**

- When a user requests to cancel a subscription, update the subscription status to "pending_cancelled" in the `/verified` path.
- Add an entry to `/pending_cancellation` in Firebase.

#### 4.2. **Cron Job for Final Cancellation**

- A Firebase function runs hourly to check `/pending_cancellation` for subscriptions that are 3 days from their end date.
- If a subscription meets the criteria, the function cancels the subscription via the Paymongo API, removes it from `/pending_cancellation`, and updates the status in `/verified` to "totally_cancelled".

#### 4.3 **Subscription Cancellation Reversal**
- Whenver a user decide to reverse a pending cancellation, update the subscription status to "active" in the `/verified` path and remove the entry to `/pending_cancellation`.