export const en = {
  common: {
    brand: 'QAVLIO', tagline: 'Buy. Sell. Discover.', continue: 'Continue', back: 'Back', cancel: 'Cancel', save: 'Save changes', loading: 'Please wait…',
    email: 'Email address', phone: 'Phone number', password: 'Password', confirmPassword: 'Confirm password', name: 'Full name', city: 'City', country: 'Country',
    logIn: 'Log in', register: 'Register', logOut: 'Log out', sellNow: 'Sell now', or: 'or', optional: 'Optional', verified: 'Verified', notVerified: 'Not verified',
  },
  auth: {
    welcome: 'Welcome back', loginTitle: 'Log in to QAVLIO', loginSubtitle: 'Pick up your conversations, saved finds, and seller tools securely.',
    identifier: 'Email or phone', identifierPlaceholder: 'you@example.com or +92…', remember: 'Keep me signed in', forgot: 'Forgot password?', signingIn: 'Signing in…', loginAction: 'Log in securely',
    phoneOtp: 'Use phone OTP instead', socialUnavailable: 'Social sign-in is not configured yet', noAccount: 'New to QAVLIO?', createAccount: 'Create an account',
    join: 'Join the community', registerTitle: 'Create your QAVLIO account', registerSubtitle: 'A short, secure setup. You can complete your profile later.',
    emailMethod: 'Continue with email', phoneMethod: 'Continue with phone', customer: 'I want to buy', seller: 'I want to sell too', accountIntent: 'How will you use QAVLIO?',
    location: 'Your location', locationHint: 'Only your city is public. Precise location is never required here.', creating: 'Creating account…', createAction: 'Create account',
    terms: 'I agree to the Terms of Use and Privacy Policy.', haveAccount: 'Already have an account?', passwordHint: '10+ characters with uppercase, lowercase, a number, and a special character',
    verifyCode: 'Enter verification code', verifyCodeSubtitle: 'We sent a six-digit code to {target}.', verifying: 'Verifying…', verifyAction: 'Verify code',
    resendIn: 'Resend available in {seconds}s', resend: 'Resend code', changeNumber: 'Change phone number', otpAccessible: 'Verification code digit {number}',
    verifyEmail: 'Verify your email', verifyEmailSubtitle: 'Open the secure link we sent to {target}. Verification protects your account and marketplace activity.',
    checkingLink: 'Checking verification link…', emailVerified: 'Email verified', emailVerifiedBody: 'Your QAVLIO identity is ready. You can now sign in and continue.',
    invalidLink: 'This verification link is invalid or expired.', resendEmail: 'Resend verification email', changeEmail: 'Change email',
    forgotTitle: 'Recover your account', forgotSubtitle: 'Enter your email or phone. We will send secure recovery instructions if the account is eligible.', sendingRecovery: 'Sending instructions…', sendRecovery: 'Send recovery instructions', recoverySent: 'Check your inbox or phone', recoverySentBody: 'If an eligible account exists, recovery instructions are on the way.',
    resetTitle: 'Create a new password', resetSubtitle: 'Your reset token is single-use and expires for your protection.', resetting: 'Resetting password…', resetAction: 'Reset password', resetSuccess: 'Password reset successfully', resetSuccessBody: 'All existing sessions were closed. Sign in again with your new password.',
    otpLoginTitle: 'Log in with phone OTP', otpLoginSubtitle: 'Enter your mobile number and we will send a one-time code.', sendingOtp: 'Sending OTP…', sendOtp: 'Send verification code',
    protectedTitle: 'Sign in to continue', protectedBody: 'QAVLIO requires a verified profile before messaging, saving, reporting, or selling. You will return to where you left off.',
    sessionExpired: 'Your session expired. Please sign in again.',
  },
  profile: {
    title: 'My profile', subtitle: 'Keep your public identity accurate and trustworthy.', profilePhoto: 'Profile photo', username: 'Username', about: 'About you', province: 'Province / state', area: 'Area', language: 'Preferred language', memberSince: 'Member since', trustCenter: 'Trust & verification',
    emailVerified: 'Email Verified', phoneVerified: 'Phone Verified', identityVerified: 'Identity Verified', businessVerified: 'Business Verified', trustedSeller: 'Trusted Seller',
    publicPreview: 'Public profile preview', saving: 'Saving profile…', saved: 'Profile updated successfully', addPhone: 'Add and verify phone', verifyPhone: 'Verify phone', sellerStatus: 'Seller status',
  },
  security: {
    title: 'Security & sessions', subtitle: 'Control passwords, active devices, and sensitive account actions.', activeSessions: 'Active sessions', currentDevice: 'Current device', lastActive: 'Last active', loginTime: 'Login time', location: 'Approximate location', logoutDevice: 'Log out this device', logoutAll: 'Log out all devices', logoutAllConfirm: 'This closes every active QAVLIO session, including this one.',
    changePassword: 'Change password', currentPassword: 'Current password', newPassword: 'New password', changingPassword: 'Changing password…', passwordChanged: 'Password changed. Sign in again.',
    dangerZone: 'Danger zone', deleteAccount: 'Delete my account', deleteExplanation: 'Your profile and listings will be hidden. Financial, trust, and moderation records may be retained where required.', deleteConfirm: 'Type DELETE to confirm', deleting: 'Deactivating account…',
    accountLink: 'Account linking', accountLinkBody: 'Link duplicate email/phone identities only after password, OTP, and explicit confirmation. QAVLIO never merges accounts automatically.',
  },
  dashboard: {
    overview: 'Overview', profile: 'My Profile', favorites: 'Favorites', savedSearches: 'Saved Searches', chats: 'My Chats', notifications: 'Notifications', recent: 'Recently Viewed', reports: 'Reports', support: 'Support', security: 'Security', settings: 'Settings',
    listings: 'My Listings', addListing: 'Add Listing', drafts: 'Drafts', sold: 'Sold Items', analytics: 'Listing Analytics', promotions: 'Promotions', payments: 'Payments', verification: 'Verification',
    customerspace: 'Customer space', sellercentre: 'Seller centre', adminconsole: 'Admin console',
  },
  admin: {
    usersTitle: 'User management', usersSubtitle: 'Review identities, verification, roles, account state, and security activity.', search: 'Search users', allStatuses: 'All statuses', allRoles: 'All roles', user: 'User', role: 'Role', status: 'Status', verification: 'Verification', activity: 'Activity', actions: 'Actions', view: 'View profile', suspend: 'Suspend account', ban: 'Ban account', restore: 'Restore account', changeRole: 'Change role', securityEvents: 'Security events',
    confirmTitle: '{action} this account?', confirmWarning: 'This is a privileged action. Active sessions may be revoked and the event will be audited.', reason: 'Reason', typeConfirmation: 'Type {phrase} to confirm', applyAction: 'Confirm action',
  },
  states: {
    active: 'Active', pending_verification: 'Pending verification', suspended: 'Suspended', banned: 'Banned', deactivated: 'Deactivated', deleted: 'Deleted', not_verified: 'Not verified', pending: 'Pending', verified: 'Verified', rejected: 'Rejected', expired: 'Expired',
  },
};
