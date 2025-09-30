import React, { useState } from 'react';
import { signup } from '../lib/api';
import Registration from './Registration';

export default function CreateAccount({ onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Preencha email e senha');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const resp = await signup(email, password);
      // if backend returned tenant info, show it
      if (resp && resp.tenant) {
        setTenantInfo(resp.tenant);
      }
  // show registration screen immediately after signup
  // do NOT sign in automatically here so the user can complete registration
  // before any auth-driven navigation occurs
  setShowRegistration(true);
    } catch (err) {
      setError(err.message || 'Falha ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const copySlug = async () => {
    if (!tenantInfo) return;
    try {
      await navigator.clipboard.writeText(tenantInfo.slug);
      // optional: small client-side acknowledgement
      setError('Slug copiado para a área de transferência');
      setTimeout(() => setError(null), 2500);
    } catch (e) {
      setError('Não foi possível copiar');
    }
  };

  if (showRegistration) {
    return <Registration onCancel={onCancel} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-md dark:bg-gray-800">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold">Criar conta</h1>
        </div>
        {error && <div className="mb-2 text-sm text-red-600">{error}</div>}

        {tenantInfo ? (
          <div className="space-y-3">
            <div className="text-sm">Conta criada com sucesso!</div>
            <div className="text-sm">Loja: <strong>{tenantInfo.name}</strong></div>
            <div className="text-sm">Slug: <code>{tenantInfo.slug}</code></div>
            <div className="flex gap-2">
              <button type="button" onClick={copySlug} className="rounded bg-black px-4 py-2 text-white">Copiar slug</button>
              <button type="button" onClick={() => setShowRegistration(true)} className="rounded bg-blue-600 px-4 py-2 text-white">Continuar cadastro</button>
              <button type="button" onClick={onCancel} className="rounded border px-4 py-2">Fechar</button>
            </div>
          </div>
        ) : (
          <>
            <label className="mb-2 block text-sm">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="mb-3 w-full rounded border px-3 py-2" />

            <label className="mb-2 block text-sm">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="mb-3 w-full rounded border px-3 py-2" />

            <label className="mb-2 block text-sm">Confirmar senha</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar senha" className="mb-4 w-full rounded border px-3 py-2" />

            <div className="flex gap-2">
              <button disabled={loading} type="submit" className="flex-1 rounded bg-black px-4 py-2 text-white">{loading ? 'Criando...' : 'Criar conta'}</button>
              <button type="button" onClick={onCancel} className="flex-1 rounded border px-4 py-2">Cancelar</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
