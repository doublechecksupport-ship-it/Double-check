export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabaseUrl = process.env.SUPABASE_URL || 'https://jxdnesvlwvmdbfwjzfga.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!serviceRoleKey || !resendApiKey) {
      return res.status(500).json({ error: 'Missing server API keys in Vercel.' });
    }

    // 1. Generate a recovery link via Supabase Admin API to obtain the 6-digit OTP code
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        type: 'recovery',
        email: cleanEmail
      })
    });

    const linkData = await linkRes.json();

    if (!linkRes.ok) {
      return res.status(linkRes.status || 400).json({
        error: linkData.msg || linkData.message || linkData.error_description || 'Could not generate reset code for that email.'
      });
    }

    const otpCode = linkData.properties?.email_otp || linkData.email_otp;
    if (!otpCode) {
      return res.status(400).json({
        error: 'Could not generate a 6-digit reset code for that email.'
      });
    }

    // 2. Send the 6-digit recovery code via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Double Check <onboarding@resend.dev>',
        to: cleanEmail,
        subject: 'Your Double Check password reset code',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1d1d1f;">
            <h2 style="margin: 0 0 12px; font-size: 20px;">Reset Your Double Check Password</h2>
            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #4b5563;">
              Enter this 6-digit verification code in your existing Double Check window to set a new password:
            </p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f3f4f6; color: #111827; padding: 16px 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
              ${otpCode}
            </div>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              If you did not request this password reset, you can safely ignore this email.
            </p>
          </div>
        `
      })
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      return res.status(emailRes.status || 400).json({
        error: emailData.message || 'Failed to send reset code email.'
      });
    }

    return res.status(200).json({
      success: true,
      message: '6-digit reset code sent. Enter it below to set a new password.'
    });
  } catch (err) {
    console.error('Forgot password API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
