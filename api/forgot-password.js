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
      'https://jxdnesvlwvmdbfwjzfga.supabase.co',
      'sb_publishable_t3ivgTlGaqQK2T6WhXKB3Q_WvMZW0zr'
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://double-check-kohl.vercel.app',
    });

    if (error) {
      console.error('Supabase Reset Error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: 'Password reset instructions sent.' });
  } catch (err) {
    console.error('Forgot Password API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
