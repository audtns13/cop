const jwt    = require('jsonwebtoken');
const cookie = require('cookie');

const SECRET = process.env.JWT_SECRET || 'cop-dev-secret-key';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30m' });
}

function getUser(req) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token   = cookies.token;
    if (!token) return null;
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function setCookie(res, token) {
  res.setHeader('Set-Cookie', cookie.serialize('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 60,
    path:     '/'
  }));
}

function clearCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize('token', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,
    path:     '/'
  }));
}

module.exports = { signToken, getUser, setCookie, clearCookie };
