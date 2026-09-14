import { CURRENT_WAIVER_VERSION } from "@/constants/waiver";

interface LegalDocument {
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  disclaimer: string;
  content: string;
}

export const waiverDocument: LegalDocument = {
  title: `Waiver of Liability & Assumption of Risk (v${CURRENT_WAIVER_VERSION})`,
  effectiveDate: "September 20, 2025",
  lastUpdated: "September 20, 2025",
  disclaimer:
    "Please read this Waiver carefully. By creating an account and using the MastersFit app, you acknowledge and agree to the following terms.",
  content: `## 1. Health Acknowledgment

- I understand that MastersFit provides fitness information and workout programming only and is not a medical service.
- I have been advised to consult a physician before starting any exercise program, especially if I have medical conditions, past injuries, or recent surgeries.
- It is my sole responsibility to determine whether I am physically fit and healthy enough to use the App.

## 2. Assumption of Risk

- I acknowledge that exercise and physical activity carry inherent risks, including but not limited to muscle soreness, strains, falls, heart complications, or more serious injury.
- I voluntarily assume all risks, known and unknown, related to my participation in physical activity or my use of the App.

## 3. Release of Liability

- In consideration of being allowed to access and use the App, I release and discharge MastersFit LLC, its employees, contractors, officers, and affiliates from any and all claims, demands, causes of action, or liabilities arising from my use of the App.
- This release applies to injuries, health issues, or damages of any kind, whether caused by negligence or otherwise, to the maximum extent permitted by law.

## 4. No Guarantees

- I understand that MastersFit does not guarantee any specific results, such as improved health, weight loss, strength gains, or other outcomes.
- I acknowledge that results depend on individual effort, consistency, nutrition, health status, and other personal factors.

## 5. Binding Agreement

- I confirm that I have read this Waiver, fully understand its terms, and agree voluntarily.
- This Waiver is binding upon me, my heirs, executors, administrators, and assigns.

## 6. Contact

For questions regarding this Agreement, contact:

MastersFit LLC
1606 NW 106th Ter
Kansas City, MO 64155-1656
legal@mastersfit.ai`,
};

export const termsDocument: LegalDocument = {
  title: `MastersFit LLC – Terms & Conditions (v${CURRENT_WAIVER_VERSION})`,
  effectiveDate: "September 20, 2025",
  lastUpdated: "September 20, 2025",
  disclaimer:
    'Welcome to MastersFit ("we," "us," "our"). These Terms & Conditions ("Terms") govern your access and use of the MastersFit mobile application, website, and related services (collectively, the "App"). Please read them carefully. By creating an account, subscribing, or otherwise using the App, you agree to be bound by these Terms. If you disagree, you must not use the App.',
  content: `## 1. Eligibility

- You must be at least 18 years of age to use MastersFit.
- By using the App, you confirm that you are legally able to enter into this Agreement.

## 2. Health & Medical Disclaimer

- **Consult a Physician:** Always consult a qualified healthcare professional before beginning any exercise program, especially if you have existing medical conditions, injuries, or recent surgeries.
- **No Medical Advice:** MastersFit content (including workouts, exercise suggestions, and recommendations) is for informational and educational purposes only and should not be considered medical advice, diagnosis, or treatment.
- **Assumption of Risk:** You acknowledge that exercise involves risks of injury or health complications. By using the App, you voluntarily assume all risks associated with your participation in physical activities.

## 3. Use of the App

- MastersFit provides personalized fitness programming and workout logging tools. Results vary depending on individual effort, consistency, nutrition, health, and other factors.
- You agree not to misuse the App, including by:
  - Attempting to copy, reverse-engineer, or resell the App or its content.
  - Submitting false or misleading information.
  - Using the App in a way that violates applicable laws or regulations.

## 4. User Accounts

- You are responsible for keeping your account credentials secure.
- You agree to provide accurate information during the onboarding and profile setup process.
- You are responsible for all activity that occurs under your account.

## 5. Subscriptions & Payments

- MastersFit may offer subscription plans (monthly, annual, or otherwise). By subscribing, you agree to pay the fees disclosed at the time of purchase.
- Payments are processed through third-party providers (e.g., Apple App Store, Google Play Store). They are subject to their respective terms and conditions.
- Subscriptions automatically renew unless canceled in accordance with the platform's cancellation policies.

## 6. Intellectual Property

- All content, branding, software, and intellectual property associated with MastersFit are owned by MastersFit LLC.
- You may not copy, reproduce, distribute, or use any content from the App except as permitted for personal, non-commercial fitness use.

## 7. Third-Party Content

MastersFit may provide links to or embed exercise demonstration videos from YouTube and other third-party platforms. These videos are provided "as is" and are subject to the terms, conditions, and availability of the respective content owners. MastersFit does not endorse, control, or guarantee the accuracy, completeness, or safety of any third-party content. Videos may be removed or become unavailable at any time without notice. Your use of any third-party content is at your own risk and subject to the policies of the hosting platform (e.g., YouTube).

## 8. Privacy

Your use of the App is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information.

## 9. Limitation of Liability

To the maximum extent permitted by law:

- MastersFit LLC, its employees, contractors, and affiliates are not liable for any direct, indirect, incidental, consequential, or special damages resulting from your use of the App.
- Our total liability for any claim shall not exceed the amount paid by you for the App in the past twelve (12) months, or one hundred dollars ($100), whichever is greater.

## 10. Indemnification

You agree to indemnify and hold harmless MastersFit LLC, its officers, employees, and contractors from any claims, damages, or liabilities arising out of your use of the App or violation of these Terms.

## 11. Termination

- MastersFit may suspend or terminate your account at any time, without notice, if you violate these Terms or misuse the App.
- You may stop using the App and cancel your subscription at any time through your account settings or the app store provider.

## 12. Governing Law

These Terms shall be governed by and construed in accordance with the laws of the State of Wyoming, without regard to conflict-of-law principles.

## 13. Changes to Terms

We may update these Terms periodically. Updates will be posted in the App with a revised "Last Updated" date. Your continued use of the App indicates acceptance of the updated Terms.

## 14. Contact Us

For questions regarding these Terms, contact:

MastersFit LLC
1606 NW 106th Ter
Kansas City, MO 64155-1656
legal@mastersfit.ai`,
};

export const privacyDocument: LegalDocument = {
  title: `Privacy Policy (v${CURRENT_WAIVER_VERSION})`,
  effectiveDate: "September 20, 2025",
  lastUpdated: "September 14, 2026",
  disclaimer:
    "MastersFit LLC values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, share, and safeguard your data when you use the MastersFit mobile application, website, and related services. By using the App, you agree to the terms of this Privacy Policy. If you disagree, please discontinue use.",
  // Kept verbatim in sync with website/privacy.html -- same source text, two
  // renderers. If you edit one, edit the other in the same change.
  content: `## The short version

- **We ask for your email so you can sign in — that is all it is.** MastersFit has no passwords. We email you a one-time code instead, so there is no password of yours for us to store or for anyone to steal.
- **We do not sell your personal information, and we never share it for advertising.** That applies to your health information without exception.
- **Our AI is never told who you are.** When it builds your plan it receives your fitness details — age, goals, limitations, equipment — with no name, email, or account number attached.
- **Most of your Apple Health and Health Connect data never leaves your phone.** Steps and calories are read on your device to show you, and are not uploaded to us.
- **You can erase everything.** Settings, then Delete Account. It is immediate, permanent, and needs no email to us.

The full detail is below.

## 1. Information We Collect

### Personal Information You Provide

- Your email address, which is used to sign you in and to send you service messages
- Your first name, used to address you in the app
- Age, gender, height, weight, fitness goals, workout preferences, physical limitations, and any medical notes you choose to enter during onboarding

### Health & Fitness Data

With your permission, we read health and activity data from Apple Health or Health Connect. How we handle it depends on the type:

- **Read on your device only, never uploaded:** steps, calories burned, and workout duration. These are displayed to you in the app and are not transmitted to or stored by MastersFit.
- **Stored by MastersFit:** the average and peak heart rate for a workout you complete in the app, saved alongside that workout so your history is accurate.
- **Written back, with your permission:** completed MastersFit workouts can be saved into Apple Health or Health Connect so they appear in your activity rings.

We request only the health permissions the app actually uses, and you can revoke them at any time in your device settings.

### Usage & Activity Data

- Workouts generated, logged results, and performance history
- Device information such as operating system and app version
- Feature usage and app interactions, recorded against a random account identifier rather than your name or email

### Subscription & Payment Data

- Subscription status and transaction information, handled by the Apple App Store or Google Play Store. MastersFit never sees or stores your card details.

### Feedback & Communications

- Messages, bug reports, survey responses, or other input you voluntarily send us

## 2. How We Use Your Information

We use your data to:

- Build and personalize your workout plans
- Track your progress and store your workout history
- Operate, maintain, secure, and improve the App
- Send you service messages such as your sign-in code and renewal notices
- Enforce our Terms & Conditions and prevent abuse
- Comply with legal obligations

**We do not use your personal information to train artificial-intelligence models**, and we do not permit our AI provider to do so either.

## 3. How AI Personalization Works

Your training plan is generated by a third-party AI service that processes your data on our behalf. Because this is the question we are asked most, here is exactly what happens.

**What is sent:** your age, gender, height, weight, goals, physical limitations, any medical notes you entered, fitness level, preferred training styles, available days, session length, workout environment, and available equipment.

**What is never sent:** your name, your email address, your account identifier, your device identifiers, or your payment information. The AI service is not told who you are and has no way to connect the request to you as a person.

**What the provider may do with it:** process the request and return your plan. Under our agreement, the provider may not use your data to train its own models and may not use it for advertising.

## 4. Sharing & Disclosure

**We do not sell your personal information, and we do not share it for advertising or cross-context behavioral advertising.** We never sell or share your health data for any marketing purpose.

We share limited data with the service providers we rely on to operate the App, each of which is contractually restricted to processing it on our behalf:

- **Anthropic** — generates your workout plans, receiving the de-identified information described in Section 3
- **Neon** and **Render** — database and application hosting in the United States
- **Upstash** — queueing for background jobs such as plan generation
- **Mixpanel** — product analytics. We do not send Mixpanel your name, your email address, or your physical limitations; analytics are recorded against a random account identifier.
- **Sentry** — crash and error diagnostics. Crash reports are configured to exclude personal information, and the app does not attach screenshots to them, so your on-screen health data cannot be captured in an error report.
- **Resend** — delivery of transactional email such as your sign-in code
- **RevenueCat** — subscription status management
- **Apple** and **Google** — payment processing, app distribution, push notifications, and the health platforms you choose to connect

We may also disclose information when required by law, regulation, or valid legal process, and if MastersFit LLC undergoes a merger, acquisition, or asset sale, in which case your data may be transferred subject to this Policy.

## 5. Data Storage & Security

- All traffic between the app and our servers is encrypted in transit using TLS, and data is encrypted at rest by our hosting providers.
- **There are no passwords.** We use one-time sign-in codes, so no password of yours exists to be stolen or reused.
- Your sign-in credentials are held in the iOS Keychain or the Android Keystore on your device.
- Access to production data is restricted to authorized personnel and is logged.
- Crash and diagnostic reports are configured to exclude personal and health information.
- While we take these precautions, no system is completely secure and we cannot guarantee absolute protection. If a breach affects your personal information, we will notify you and the relevant regulators as required by applicable law.

## 6. Data Retention

- We keep your account data for as long as your account exists.
- If you delete your account, your personal and fitness data is erased immediately, as described below.
- If your account is inactive for 24 consecutive months, we may delete it and its data.
- Transaction records required for tax and accounting purposes are retained for as long as the law requires, separately from your fitness data.

## 7. Deleting Your Account

You can delete your account at any time from Settings, then Delete Account. No request to us is needed and there is no waiting period.

Deletion permanently removes your profile, workouts, plans, logged sets, progress history, imported heart-rate data, subscription record, and your analytics profile. It is not recoverable.

Two things survive deletion, and only these: a one-way cryptographic hash of your email address, which cannot be reversed to recover your address and exists solely so we can honor your deletion and detect abuse; and any billing records we are legally required to keep.

Deleting your MastersFit account does not cancel a subscription billed by Apple or Google. Cancel that in your Apple or Google account settings.

## 8. Your Rights & Choices

Depending on where you live, you may have the right to:

- Access, update, or correct your information
- Request deletion of your data
- Request a copy of your data in a portable format
- Opt out of marketing communications, using the unsubscribe link in any such email
- Exercise additional rights under applicable laws, including the GDPR in the EU and UK and the CCPA/CPRA in California

We will not discriminate against you for exercising any of these rights. To make a request, contact us at the address below.

## 9. Children's Privacy

MastersFit is intended for users 18 years or older. We do not knowingly collect data from anyone under 18. If we learn that we have, we will delete it.

## 10. International Users

If you use the App outside the United States, your data will be transferred to and processed in the United States. We rely on Standard Contractual Clauses where required for transfers from the EU, UK, and Switzerland.

## 11. Changes to this Privacy Policy

We may update this Policy from time to time. Updates are posted in the App and on our website with a revised "Last Updated" date. If a change materially affects how we use your data, we will tell you in the app before it takes effect.

## 12. Contact Us

For questions regarding this Privacy Policy, or to exercise any of the rights above, contact:

MastersFit LLC
1606 NW 106th Ter
Kansas City, MO 64155-1656
legal@mastersfit.ai`,
};

// Export individual content strings for backward compatibility
export const waiverContent = `# ${waiverDocument.title}

**Effective Date:** ${waiverDocument.effectiveDate}
**Last Updated:** ${waiverDocument.lastUpdated}

## Important Notice

${waiverDocument.disclaimer}

${waiverDocument.content}`;

export const termsContent = `# ${termsDocument.title}

**Effective Date:** ${termsDocument.effectiveDate}
**Last Updated:** ${termsDocument.lastUpdated}

${termsDocument.disclaimer}

${termsDocument.content}`;

export const privacyContent = `# ${privacyDocument.title}

**Effective Date:** ${privacyDocument.effectiveDate}
**Last Updated:** ${privacyDocument.lastUpdated}

## Your Privacy Matters

${privacyDocument.disclaimer}

${privacyDocument.content}`;
