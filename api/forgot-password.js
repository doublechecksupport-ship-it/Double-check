import { createClient } from '@supabase/supabase-js';

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

    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://jxdnesvlwvmdbfwjzfga.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'sb_publishable_t3ivgTlGaqQK2T6WhXKB3Q_WvMZW0zr'
    );

    // Trigger Supabase's built-in reset email (Supabase will handle token creation)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin || 'https://double-check-kohl.vercel.app'}`,
    });

    if (error) {
      console.error('Supabase Reset Error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: 'Password reset instructions sent.' });
  } catch (err) {
    console.error('Forgot Password API Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
