import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";

export const TERMS_OF_USE_HREF = "/terms";

export type TermsOfUseSection = {
  heading: string;
  paragraphs: string[];
};

/**
 * Static terms for accounts, the web app, personal API tokens, and the Play shell.
 * Plain language only — same spirit as the privacy policy.
 */
export const termsOfUseSections: TermsOfUseSection[] = [
  {
    heading: "The service",
    paragraphs: [
      `EvoLift at ${PUBLIC_APP_ORIGIN} is a workout logging app. You can use the website and, when available, the Android app from Google Play.`,
      "By creating an account or using the service, you agree to these terms.",
    ],
  },
  {
    heading: "Your account",
    paragraphs: [
      "You can use an email and password, or sign in with Google or Apple.",
      "Keep your password private when you use one. You are responsible for activity on your account.",
      "You can delete the account from Account. After that, that email cannot log in.",
    ],
  },
  {
    heading: "Your workout data",
    paragraphs: [
      "Workout sessions, sets, templates, plans, goals, and the profile fields you save belong to your account.",
      "How that data is stored and deleted is described in the privacy policy.",
    ],
  },
  {
    heading: "Personal API tokens",
    paragraphs: [
      "You may create personal API tokens on Account to call the EvoLift API for your own account.",
      "Do not share a token. Do not use the API to harm the service or other users. You can revoke a token at any time on Account.",
    ],
  },
  {
    heading: "Not medical advice",
    paragraphs: [
      "EvoLift helps you log training. It does not give medical advice. Train within your limits and get professional help when you need it.",
    ],
  },
  {
    heading: "Availability",
    paragraphs: [
      "The service is provided as available. Features may change. There is no promise of uninterrupted access.",
    ],
  },
  {
    heading: "Changes to these terms",
    paragraphs: [
      "These terms may be updated. Continued use after a change means you accept the updated terms. The current version is always on this page.",
    ],
  },
];
