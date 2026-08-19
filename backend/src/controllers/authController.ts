import { AUTH_PURPOSES } from '../constants/account.js';
import { authSettingsService } from '../services/authSettingsService.js';
import { socialAuthCapabilities } from '../services/socialAuthService.js';
import { getProfile } from '../services/userService.js';
import {
  clearRefreshCookie,
  getRefreshCookie,
  loginWithPassword,
  logout,
  refreshSession,
  registerWithEmail,
  registerWithPhone,
  requestPasswordReset,
  requestPhoneOtpLogin,
  resendEmailVerificationChallenge,
  resendVerification,
  resetPassword,
  setRefreshCookie,
  verifyEmail,
  verifyOtp,
} from '../services/authService.js';

export async function register(req: any, res: any) {
  const result = req.body.method === 'phone' ? await registerWithPhone(req.body, req) : await registerWithEmail(req.body, req);
  res.status(201).json({ success: true, data: result, message: req.body.method === 'phone' ? 'Account created. Verify your phone to continue.' : 'Account created.' });
}

export async function login(req: any, res: any) {
  const result: any = await loginWithPassword(req.body, req);
  if (result.otpRequired) {
    // Do not set cookie yet; client must complete OTP flow.
    return res.json({ success: true, data: { user: result.user, otpRequired: true, verification: result.verification }, message: 'OTP verification is required' });
  }
  setRefreshCookie(res, result);
  res.json({ success: true, data: { user: result.user, accessToken: result.accessToken }, message: 'Welcome back to QAVLIO' });
}

export async function requestOtp(req: any, res: any) {
  const result = await requestPhoneOtpLogin(req.body.phone, req);
  res.json({ success: true, data: result, message: result.message });
}

export async function verifyOtpCode(req: any, res: any) {
  const result = await verifyOtp(req.body, req);
  const accessToken = 'accessToken' in result ? result.accessToken : undefined;
  const verified = 'verified' in result ? result.verified : undefined;
  if ('rawRefreshToken' in result) setRefreshCookie(res, result);
  res.json({ success: true, data: { user: result.user, accessToken, verified }, message: accessToken ? 'Signed in successfully' : 'Phone verified successfully' });
}

export async function resendOtp(req: any, res: any) { res.json({ success: true, data: await resendVerification(req.body, req) }); }
export async function resendEmailVerification(req: any, res: any) { res.json({ success: true, data: await resendEmailVerificationChallenge(req.body.email, req) }); }
export async function verifyEmailToken(req: any, res: any) { res.json({ success: true, data: await verifyEmail(req.body, req), message: 'Email verified successfully' }); }
export async function verifyEmailLink(req: any, res: any) { res.json({ success: true, data: await verifyEmail({ email: req.query.target || req.query.email, token: req.query.token }, req), message: 'Email verified successfully' }); }
export async function forgotPassword(req: any, res: any) { res.json({ success: true, data: await requestPasswordReset(req.body.identifier, req) }); }
export async function resetPasswordAction(req: any, res: any) { res.json({ success: true, data: await resetPassword(req.body, req) }); }

export async function refresh(req: any, res: any) {
  const result = await refreshSession(getRefreshCookie(req), req);
  setRefreshCookie(res, result);
  res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
}

export async function logoutAction(req: any, res: any) {
  const result = await logout(getRefreshCookie(req), req);
  clearRefreshCookie(res);
  res.json({ success: true, data: result });
}

export async function authenticatedMe(req: any, res: any) { res.json({ success: true, data: await getProfile(req.auth.userId) }); }
export function socialProviders(_req: any, res: any) { res.json({ success: true, data: socialAuthCapabilities() }); }
export async function authCapabilities(_req: any, res: any) {
  const otp = await authSettingsService.otpStatus();
  res.json({
    success: true,
    data: {
      methods: ['email_password', 'phone_password', 'phone_otp'],
      verificationPurposes: Object.values(AUTH_PURPOSES),
      social: socialAuthCapabilities(),
      otp,
    },
  });
}
