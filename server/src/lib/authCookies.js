const ACCESS_COOKIE = 'berry_access_token';
const REFRESH_COOKIE = 'berry_refresh_token';
const REFRESH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

function cookieOptions(maxAgeSeconds) {
  const secure = process.env.NODE_ENV === 'production';
  const configuredSameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'Lax').toLowerCase();
  const sameSite = ['lax', 'strict', 'none'].includes(configuredSameSite) ? configuredSameSite[0].toUpperCase() + configuredSameSite.slice(1) : 'Lax';
  const safeSameSite = sameSite === 'None' && !secure ? 'Lax' : sameSite;
  return `Path=/api; HttpOnly; SameSite=${safeSameSite}; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}

export function readCookie(req, name) {
  const prefix = `${name}=`;
  for (const part of (req.headers.cookie || '').split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      try { return decodeURIComponent(value.slice(prefix.length)); } catch { return null; }
    }
  }
  return null;
}

export function setSessionCookies(res, session) {
  const accessAge = Math.max(1, Number(session.expires_in) || 3600);
  res.append('Set-Cookie', `${ACCESS_COOKIE}=${encodeURIComponent(session.access_token)}; ${cookieOptions(accessAge)}`);
  res.append('Set-Cookie', `${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token)}; ${cookieOptions(REFRESH_COOKIE_MAX_AGE)}`);
}

export function clearSessionCookies(res) {
  const expired = cookieOptions(0);
  res.append('Set-Cookie', `${ACCESS_COOKIE}=; ${expired}`);
  res.append('Set-Cookie', `${REFRESH_COOKIE}=; ${expired}`);
}

export function authCookieNames() { return { access: ACCESS_COOKIE, refresh: REFRESH_COOKIE }; }
