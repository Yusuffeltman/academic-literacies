# Student Passwordless Sign-In

The app now uses Firebase's built-in email-link authentication for students.

Students do not need to know their UJ email address or create a password. They enter their student number, and the app sends a secure sign-in link to their personal email address, such as Gmail or Outlook.

## How it works

1. Student enters their student number.
2. The app looks up the student on the current class list.
3. The app finds the student's personal email address from that record.
4. Firebase sends a secure sign-in link to that personal email address.
5. The student opens the link.
6. The app signs them in and syncs their student profile to the canonical student identity.

## Why this is safer

- No SMTP credentials in the project
- No third-party transactional mail setup
- No custom token-minting backend
- No need for students to know the UJ email format
- No student password required for the email-link flow

## Files

- Auth flow: `src/auth.js`
- Firebase client setup: `src/firebase.js`
- Student profile mapping: `src/profile.js`
- Auth screen UI: `index.html`

## Firebase setup

Enable Email Link sign-in in Firebase Authentication.

### 1. Open Firebase Console

- Go to `Authentication`
- Go to `Sign-in method`
- Enable `Email/Password`
- Enable `Email link (passwordless sign-in)`

### 2. Add your app domains to Authorized Domains

In Firebase Authentication settings, make sure these domains are authorized:

- your production app domain
- any Moodle domain that hosts or frames the app
- local dev domains if needed, such as `localhost`

### 3. Deploy the web app

The email-link flow is client-side and does not need Firebase Functions.

## Operational requirement

Each student record must include a usable personal email address in the class list.

That personal email is where the sign-in link goes.

## Student-facing explanation

Use your student number to access ALE00Y1.

If you are not signed in automatically, the app will send a secure sign-in link to your personal email address, such as Gmail or Outlook.

## Staff accounts

Staff and administrator accounts remain on the normal email-and-password flow.
