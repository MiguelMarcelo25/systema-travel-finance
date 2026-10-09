export function isVerificationExempt(user) {
  return user?.role === 'Administrator' && user.email === 'admin@systema.com';
}

export function needsEmailVerification(user) {
  return Boolean(user && !user.email_verified_at && !isVerificationExempt(user));
}
