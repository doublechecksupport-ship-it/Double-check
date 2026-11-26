export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const supabaseUrl = 'https://jxdnesvlwvmdbfwjzfga.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!serviceRoleKey || !resendApiKey) {
      return res.status(500).json({ error: 'Missing server API keys in Vercel.' });
    }

    // 1. Generate a valid password recovery link via Supabase Admin API
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        type: 'recovery',
        email: email,
        redirect_to: 'https://double-check-kohl.vercel.app'
      })
    });

    const linkData = await linkRes.json();

    if (!linkRes.ok || !linkData.action_link) {
      return res.status(400).json({
        error: linkData.msg || linkData.message || 'Could not generate reset link for that email.'
      });
    }

    // 2. Send the recovery email directly via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Double Check <onboarding@resend.dev>',
        to: email,
        subject: 'Reset your Double Check password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1d1d1f; margin-bottom: 12px;">Reset Your Password</h2>
            <p style="color: #555; font-size: 14px; line-height: 1.5;">
              Click the button below to set a new password for your Double Check account:
            </p>
            <a href="${linkData.action_link}" style="display: inline-block; background: #1d1d1f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 980px; font-size: 14px; font-weight: 500; margin: 20px 0;">
              Reset Password
            </a>
            <p style="color: #86868b; font-size: 12px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `
      })
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      return res.status(emailRes.status).json({
        error: emailData.message || 'Resend failed to send the email.'
      });
    }

    return res.status(200).json({ success: true, message: 'Password reset instructions sent.' });
  } catch (err) {
    console.error('Forgot Password API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
