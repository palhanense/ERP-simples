import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(username, password);
    } catch (err) {
      setError(err.message || 'Falha ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-md dark:bg-gray-800">
        <div className="mb-4 text-center">
          <h1 className="text-4xl font-extrabold">Menju</h1>
        </div>
        {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
        <label className="mb-2 block text-sm">Email</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Email" className="mb-3 w-full rounded border px-3 py-2" />
        <label className="mb-2 block text-sm">Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="mb-4 w-full rounded border px-3 py-2" />
        <button disabled={loading} className="w-full rounded bg-black px-4 py-2 text-white">{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </div>
  );
}
