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
      "It stores your email, and the password held by Supabase Auth.",
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
    heading: "Delete the account",
    paragraphs: [
      "You can delete the account and the workout data stored for it from Account. On the Login tab, enter your current password and confirm Delete account. After that, that email cannot log in.",
    ],
  },
];
