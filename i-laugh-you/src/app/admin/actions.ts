"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  verifyAdminLogin,
} from "@/lib/admin-auth";

export async function loginAdminAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect("/admin?error=missing_fields");
  }

  const isValid = verifyAdminLogin(username, password);
  if (!isValid) {
    redirect("/admin?error=invalid_credentials");
  }

  const token = createAdminSessionToken(username);
  const cookieOptions = getAdminSessionCookieOptions();
  const cookieStore = await cookies();

  cookieStore.set(cookieOptions.name, token, {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
    maxAge: cookieOptions.maxAge,
  });

  redirect("/admin");
}

export async function logoutAdminAction() {
  const cookieOptions = getAdminSessionCookieOptions();
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
    maxAge: 0,
  });

  redirect("/admin");
}
