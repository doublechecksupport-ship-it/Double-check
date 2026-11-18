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
    const apiKey = 'sb_publishable_t3ivgTlGaqQK2T6WhXKB3Q_WvMZW0zr';

    // Call Supabase GoTrue Auth recover endpoint directly via HTTP fetch
    const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        email: email,
        redirect_to: 'https://double-check-kohl.vercel.app'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error_description || data.msg || data.message || 'Failed to send reset email.' 
      });
    }

    return res.status(200).json({ success: true, message: 'Password reset instructions sent.' });
  } catch (err) {
    console.error('Forgot Password API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
