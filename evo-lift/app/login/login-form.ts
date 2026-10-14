export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function loginEmailError(normalizedEmail: string): string | null {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function loginPasswordError(input: {
  password: string;
  confirmPassword: string;
  mode: "login" | "register";
}): string | null {
  if (input.password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[a-zA-Z]/.test(input.password) || !/[0-9]/.test(input.password)) {
    return "Password must include at least one letter and one number.";
  }
  if (input.mode === "register" && input.password !== input.confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export function friendlyAuthError(rawMessage: string): string {
  const messageLower = rawMessage.toLowerCase();
  if (
    messageLower.includes("user already registered") ||
    messageLower.includes("already been registered")
  ) {
    return "This email is already registered. Try logging in instead.";
  }
  if (messageLower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  return rawMessage;
}
