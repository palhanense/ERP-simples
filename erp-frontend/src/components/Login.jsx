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

  const fillDemoCredentials = () => {
    setUsername('admin@example.com');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-md dark:bg-gray-800">
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold">Menju</h1>
          <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Entrar</h3>
        </div>
        {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
        <div className="mb-3 text-xs text-neutral-500">
          Use <strong>admin@example.com</strong> / <strong>admin123</strong> para demo.
          <button type="button" onClick={fillDemoCredentials} className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">Preencher</button>
        </div>
        <label className="mb-2 block text-sm">Email</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="mb-3 w-full rounded border px-3 py-2" />
        <label className="mb-2 block text-sm">Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4 w-full rounded border px-3 py-2" />
        <button disabled={loading} className="w-full rounded bg-black px-4 py-2 text-white">{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </div>
  );
}
