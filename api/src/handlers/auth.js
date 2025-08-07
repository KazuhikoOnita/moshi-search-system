import { SignJWT, jwtVerify } from 'jose';
import { corsHeaders } from '../utils/cors.js';

export async function handleAuth(request, env, type = 'login') {
  if (type === 'callback') {
    return await handleCallback(request, env);
  }
  
  // Google OAuth2 login URL generation
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback`;
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly');
  authUrl.searchParams.set('hd', env.ALLOWED_DOMAIN); // 会社ドメインに限定
  
  return Response.redirect(authUrl.toString(), 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  
  if (error) {
    return new Response(`Auth error: ${error}`, { status: 400 });
  }
  
  if (!code) {
    return new Response('No authorization code provided', { status: 400 });
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${url.origin}/api/auth/callback`,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
    }
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });
    
    const userInfo = await userResponse.json();
    
    // Verify domain
    if (!userInfo.email.endsWith(`@${env.ALLOWED_DOMAIN}`)) {
      return new Response('Unauthorized domain', { status: 403 });
    }
    
    // Create JWT token
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const jwt = await new SignJWT({
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(secret);
    
    // Redirect to frontend with token
    const origin = new URL(request.url).origin;
    const frontendUrl = origin.includes('localhost') 
      ? 'http://localhost:5173' 
      : 'https://moshi-search.pages.dev';
    return Response.redirect(`${frontendUrl}?token=${jwt}`, 302);
    
  } catch (error) {
    console.error('Auth callback error:', error);
    return new Response(`Authentication failed: ${error.message}`, { status: 500 });
  }
}

export async function verifyToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }
  
  const token = authHeader.substring(7);
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}