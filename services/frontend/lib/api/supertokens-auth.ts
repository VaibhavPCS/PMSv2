// SuperTokens auth bridge. The ported screens were written against the OLD
// monolith endpoints (/auth/login, /auth/register, /auth/me ...) which DO NOT
// exist in the new backend. The new backend uses SuperTokens' EmailPassword +
// Session recipes plus the auth-service profile route (GET /api/v1/auth/me).
//
// We call the supertokens-web-js SDK directly (NOT raw axios): Session.init()
// installs a global XHR/fetch interceptor on the apiDomain, so a hand-rolled
// POST to /auth/signin collides with it and throws a generic error. The SDK's
// own signIn/signUp/signOut handle formFields, cookies, the front-token header,
// and anti-csrf correctly.
//
// NOTE: there is NO email-verification / OTP step in the config (EmailPassword
// + Session only), so signin/signup complete in one hop.

import EmailPassword from 'supertokens-web-js/recipe/emailpassword';
import Session from 'supertokens-web-js/recipe/session';

// Map a SuperTokens recipe response to either success or a thrown Error whose
// message feeds the caller's onError/catch toast.
function handle(res: {
  status: string;
  user?: unknown;
  formFields?: { id: string; error: string }[];
  reason?: string;
}) {
  if (res.status === 'OK') return res;
  if (res.status === 'WRONG_CREDENTIALS_ERROR') {
    throw new Error('Incorrect email or password.');
  }
  if (res.status === 'EMAIL_ALREADY_EXISTS_ERROR') {
    throw new Error('An account with this email already exists.');
  }
  if (res.status === 'FIELD_ERROR' && res.formFields?.length) {
    throw new Error(res.formFields.map(f => f.error).join(' '));
  }
  if (res.status === 'SIGN_IN_NOT_ALLOWED' || res.status === 'SIGN_UP_NOT_ALLOWED') {
    throw new Error(res.reason || 'This action is not allowed.');
  }
  throw new Error('Authentication failed. Please try again.');
}

export async function stSignIn(email: string, password: string) {
  const res = await EmailPassword.signIn({
    formFields: [
      { id: 'email', value: email },
      { id: 'password', value: password },
    ],
  });
  return handle(res);
}

export async function stSignUp(email: string, password: string, name?: string) {
  // Forward `name` as a SuperTokens formField so the auth-service signUpPOST
  // override persists it on the Prisma user row (previously the name was
  // dropped and every new user was created nameless).
  const formFields = [
    { id: 'email', value: email },
    { id: 'password', value: password },
  ];
  if (name !== undefined && name !== null) {
    formFields.push({ id: 'name', value: name });
  }
  const res = await EmailPassword.signUp({ formFields });
  return handle(res);
}

export async function stSignOut() {
  await Session.signOut();
}
