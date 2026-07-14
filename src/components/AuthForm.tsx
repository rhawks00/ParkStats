import { useState } from 'react';
import { supabase } from '../services/supabase';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Check your email for a confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }

    setLoading(false);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      <button type="submit" className="auth-btn" disabled={loading}>
        {loading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
      </button>
      <button
        type="button"
        className="toggle-auth"
        onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
      >
        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
    </form>
  );
}
