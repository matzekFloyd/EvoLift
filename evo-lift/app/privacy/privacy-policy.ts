import { OPERATOR_EMAIL, OPERATOR_NAME } from "@/app/legal/legal-notice";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";

export const PRIVACY_POLICY_HREF = "/privacy";

export type PrivacyPolicySection = {
  heading: string;
  paragraphs: string[];
};

export const privacyPolicySections: PrivacyPolicySection[] = [
  {
    heading: "What the account stores",
    paragraphs: [
      `EvoLift at ${PUBLIC_APP_ORIGIN} stores the data needed to run your account.`,
      "It stores your email, and the password held by Supabase Auth when you set one. If you sign in with Google or Apple, that provider confirms the email.",
      "It stores workout sessions and sets, templates, plans, and goals.",
      "It stores bodyweight, height, sex, and date of birth when you save them on Account.",
      "It stores personal API tokens you create on Account.",
    ],
  },
  {
    heading: "How this data is used",
    paragraphs: [
      "This data is used to run the account: to sign you in, to keep your workouts, and to let a token you created call the API.",
    ],
  },
  {
    heading: "Who is responsible",
    paragraphs: [
      `The controller is ${OPERATOR_NAME}, the person named on the legal notice. Email ${OPERATOR_EMAIL}.`,
      "Supabase stores the account and the workout data. Vercel hosts the site. Resend sends confirm, reset, and email-change messages.",
      "Google or Apple receives the sign-in only when you use that button.",
    ],
  },
  {
    heading: "How long this data is kept",
    paragraphs: [
      "The data is kept while the account exists, and removed when the account is deleted.",
      "You can ask for a copy or a correction by emailing the contact on the legal notice. Deleting the account stays on Account, on the Login tab.",
    ],
  },
  {
    heading: "Delete the account",
    paragraphs: [
      "You can delete the account and the workout data stored for it from Account. On the Login tab, confirm Delete account. Enter your current password when the account has one. After that, that email cannot log in.",
    ],
  },
];
