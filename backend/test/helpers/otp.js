import { AUTH_PURPOSES } from '../../src/constants/account.js';
import { authSettingsService } from '../../src/services/authSettingsService.js';

export async function enableOtpForTests() {
  await authSettingsService.update({
    otpEnabled: true,
    otpProvider: 'console',
    otpChannel: 'sms',
    otpRequiredForSignup: true,
    otpRequiredForLogin: false,
    otpRequiredForPasswordReset: true,
  });
}

export async function disableOtpForTests() {
  await authSettingsService.update({
    otpEnabled: false,
    otpRequiredForSignup: false,
    otpRequiredForLogin: false,
    otpRequiredForPasswordReset: false,
  });
}

export { AUTH_PURPOSES };
