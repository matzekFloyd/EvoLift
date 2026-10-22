import {
  SOCIAL_SIGN_IN_LINKING_COPY,
  SOCIAL_SIGN_IN_PROVIDERS,
  type SocialSignInProvider,
} from "@/app/login/social-sign-in";

type SocialSignInButtonsProps = {
  disabled: boolean;
  onSelect: (provider: SocialSignInProvider) => void;
};

/**
 * Provider marks stay their brand colors, so these are not ActionButtons
 * (that control tints every svg). Equal size, official wording, stacked so
 * both labels fit the narrow login panel.
 */
export function SocialSignInButtons({ disabled, onSelect }: SocialSignInButtonsProps) {
  return (
    <div className="mt-5 space-y-2 border-t border-zinc-200 pt-4">
      {SOCIAL_SIGN_IN_PROVIDERS.map((item) => (
        <button
          key={item.provider}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item.provider)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:border-sky-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 disabled:opacity-60"
        >
          {item.provider === "google" ? <GoogleMark /> : <AppleMark />}
          {item.label}
        </button>
      ))}
      <p className="text-sm text-zinc-600">{SOCIAL_SIGN_IN_LINKING_COPY}</p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.083 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-900" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 1.43c0 1.14-.5 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.21-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43zm3.81 14.88c-.03.07-.67 2.29-2.22 4.54-1.33 1.93-2.71 3.86-4.89 3.9-1.07.02-1.78-.69-3.32-.69-1.54 0-2.31.67-3.55.71-2.1.09-3.7-2.09-5.04-4.01-2.74-3.95-4.83-11.16-2.02-16.04 1.39-2.42 3.88-3.95 6.58-3.99 1.23-.02 2.39.83 3.32.83.93 0 2.66-1.02 4.48-.87.76.03 2.9.31 4.27 2.32-.11.07-2.55 1.49-2.52 4.45.03 3.54 3.1 4.72 3.14 4.74-.03.07-.49 1.68-1.23 3.11z"
      />
    </svg>
  );
}
