# User story: SMS one-time-password opt-in

**Product:** HanoIT
**Business:** Routengio
**Channel:** outbound SMS only, sent from the toll-free number registered on the Twilio account
**Message type:** transactional one-time password (2FA). No marketing.

## Story

As a HanoIT user, I want to type my mobile number in the web application and request a one-time code, so that I can verify that number or complete a login challenge. I opt in by submitting that request. I do not opt in by texting a keyword.

## Opt-in

1. The user opens the HanoIT web application.
2. The user types their own mobile number in international format, with a leading `+` and country code (E.164). Example: `+17863533305`.
3. The user chooses SMS and a purpose:
   - `phone_verification` — confirm that the number belongs to the account.
   - `login_2fa` — complete a login challenge.
4. The user submits the form. That submission is the consent to receive one OTP SMS at that number.
5. The application calls the public endpoint `POST /api/v1/notifications/otp/send` with:

```json
{
  "recipient": "+17863533305",
  "channel": "sms",
  "purpose": "phone_verification"
}
```

6. The API accepts the request only when `channel` is `sms` and `recipient` matches `^\+\d{10,15}$`.
7. The API generates a 6-digit code and asks Twilio to send exactly one SMS:

```text
Tu codigo HanoIT es 482913. Expira en 5 minutos.
```

The digits change on every send. The sentence does not. HanoIT does not send marketing, alerts, or recurring notifications by SMS.

8. Twilio must accept the message. Only then does the API store a hash of the code and a hash of the phone number, and return an `otpId`. The code expires 5 minutes after it is issued. If Twilio rejects the message, the API does not store a code and does not return an `otpId`.

9. The user reads the code and submits it with the `otpId` to `POST /api/v1/notifications/otp/verify`. A correct code is accepted once and then deleted. A wrong code can be tried at most 3 times.

## What this opt-in is not

- The user does not text a keyword to the toll-free number.
- HanoIT does not process inbound SMS, opt-in keywords, HELP, or STOP replies.
- The toll-free number is a sender only.
- A phone number is never taken from a purchased list. The only recipient is the number the user just typed and submitted.

## Limits shown to the user

| Rule | Value |
|---|---|
| Code length | 6 digits |
| Code lifetime | 5 minutes |
| New SMS codes per number | 3 per hour |
| Resends of the same code | 2 |
| Wrong-code attempts | 3, then the code is blocked |

If SMS cannot be delivered, the same screen can request the code by email instead (`channel` `email`). That path does not send another SMS.

## Acceptance criteria

- No SMS is sent until the user submits their own number and asks for a code.
- The API returns an `otpId` only after Twilio accepts the SMS.
- The SMS body matches the sentence above, with a new 6-digit code.
- The code stops working after 5 minutes, after a successful check, or after 3 failed checks.
- The same number cannot receive more than 3 new OTP SMS in one hour.
