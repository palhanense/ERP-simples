import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CreateAccount from './CreateAccount';

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

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

  if (creating) {
    return <CreateAccount onCancel={() => setCreating(false)} />;
  }
  return (
    <div className="min-h-screen flex flex-row bg-surface-light dark:bg-surface-dark">
      {/* Left: large logo */}
      <div className="w-1/2 flex items-center justify-center bg-white dark:bg-gray-900 p-8">
        <img src="/logo.svg" alt="Menju" className="max-w-full h-auto w-4/5" />
      </div>

      {/* Right: login form */}
      <div className="w-1/2 flex items-center justify-center p-6">
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

          <div className="mt-4 text-center text-sm">
            <button type="button" onClick={() => setCreating(true)} className="text-black hover:underline">Criar conta</button>
          </div>
        </form>
      </div>
    </div>
  );
}
