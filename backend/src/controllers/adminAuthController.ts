import { authSettingsService } from '../services/authSettingsService.js';
import {
  clearAdminRefreshCookie,
  getAdminRefreshCookie,
  loginAdmin,
  logoutAdmin,
  presentAdmin,
  refreshAdminSession,
  setAdminRefreshCookie,
} from '../services/adminAuthService.js';

/** POST /admin/auth/login — username + password only. */
export async function adminLogin(req: any, res: any) {
  const result = await loginAdmin(req.body, req);
  setAdminRefreshCookie(res, result);
  res.json({ success: true, data: { admin: result.admin, accessToken: result.accessToken }, message: 'Welcome to the QAVLIO Admin Panel' });
}

/** POST /admin/auth/refresh — rotates the HttpOnly admin refresh session. */
export async function adminRefresh(req: any, res: any) {
  const result = await refreshAdminSession(getAdminRefreshCookie(req), req);
  setAdminRefreshCookie(res, result);
  res.json({ success: true, data: { admin: result.admin, accessToken: result.accessToken } });
}

/** POST /admin/auth/logout */
export async function adminLogout(req: any, res: any) {
  const result = await logoutAdmin(getAdminRefreshCookie(req), req);
  clearAdminRefreshCookie(res);
  res.json({ success: true, data: result });
}

/** GET /admin/auth/me */
export async function adminMe(req: any, res: any) {
  const otp = await authSettingsService.otpStatus();
  res.json({ success: true, data: { admin: presentAdmin(req.auth.user), permissions: req.auth.permissions, otp } });
}
