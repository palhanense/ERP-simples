import React, { useState } from 'react';
import { createRegistration } from '../lib/api';

function validateCPF(raw) {
  if (!raw) return false;
  const s = String(raw).replace(/\D/g, '');
  if (s.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(s)) return false;

  const digits = s.split('').map((d) => parseInt(d, 10));

  const calcVerifier = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += digits[i] * (len + 1 - i);
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  const v1 = calcVerifier(9);
  const v2 = calcVerifier(10);
  return v1 === digits[9] && v2 === digits[10];
}

export default function Registration({ onCancel }) {
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleCepLookup = async () => {
    const only = cep.replace(/\D/g, '');
    if (only.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${only}/json/`);
      const data = await resp.json();
      if (data.erro) {
        setError('CEP não encontrado');
        return;
      }
      setStreet(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      setCity(data.localidade || '');
      setUf(data.uf || '');
      setError(null);
    } catch (e) {
      setError('Falha ao buscar CEP');
    }
  };

  // small input masks to improve UX
  const maskCPF = (v) => {
    const s = String(v || '').replace(/\D/g, '').slice(0, 11);
    return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, (_, a, b, c, d) => `${a}.${b}.${c}-${d}`).replace(/^([^\.]+)$/, s);
  };

  const maskCEP = (v) => {
    const s = String(v || '').replace(/\D/g, '').slice(0, 8);
    return s.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const maskPhone = (v) => {
    const s = String(v || '').replace(/\D/g, '').slice(0, 11);
    if (s.length <= 2) return s;
    if (s.length <= 6) return s.replace(/(\d{2})(\d+)/, '$1-$2');
    return s.replace(/(\d{2})(\d{4,5})(\d{4})/, '$1-$2-$3');
  };

  const maskCNPJ = (v) => {
    const s = String(v || '').replace(/\D/g, '').slice(0, 14);
    return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, (_, a,b,c,d,e) => `${a}.${b}.${c}/${d}-${e}`).replace(/^([^\.]+)$/, s);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!fullName) return setError('Nome completo é obrigatório');
    if (!birthDate) return setError('Data de nascimento é obrigatória');
    if (!validateCPF(cpf)) return setError('CPF inválido');
    if (!/^\d{2}-\d{4,5}-\d{4}$/.test(phone)) return setError('Telefone deve ser no formato XX-XXXXX-XXXX');
    if (!/\d{8}/.test(cep.replace(/\D/g, ''))) return setError('CEP inválido');
    if (!street) return setError('Rua é obrigatória');
    if (!number) return setError('Número é obrigatório');
    if (!neighborhood) return setError('Bairro é obrigatório');
    if (!city) return setError('Cidade é obrigatória');
    if (!uf) return setError('UF é obrigatória');

    const payload = {
      store_name: storeName,
      full_name: fullName,
      birth_date: birthDate,
      cpf: cpf.replace(/\D/g, ''),
      phone,
      address: { cep: cep.replace(/\D/g, ''), street, number, neighborhood, city, uf },
      cnpj: cnpj ? cnpj.replace(/\D/g, '') : null,
    };

    setLoading(true);
    try {
      await createRegistration(payload);
      setSuccess('Cadastro enviado com sucesso! Acompanhe seu e-mail ou painel para confirmação.');
    } catch (err) {
      setError(err.message || 'Falha ao enviar cadastro');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    fullName &&
    birthDate &&
    validateCPF(cpf) &&
    /^\d{2}-\d{4,5}-\d{4}$/.test(phone) &&
    /\d{8}/.test(cep.replace(/\D/g, '')) &&
    street &&
    number &&
    neighborhood &&
    city &&
    uf;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Cadastro</h2>
      {error && <div className="mb-2 text-red-600">{error}</div>}
      {success && <div className="mb-2 text-green-600">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Nome da loja</label>
          <input className="w-full rounded border px-3 py-2" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Seu nome completo</label>
          <input className="w-full rounded border px-3 py-2" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sm">Sua data de nascimento</label>
            <input type="date" className="w-full rounded border px-3 py-2 text-sm" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Seu CPF</label>
            <input className="w-full rounded border px-3 py-2 text-sm" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="block text-sm">Seu telefone</label>
            <input className="w-full rounded border px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="11-99999-9999" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <label className="block text-sm">Seu CEP</label>
            <input className="w-full rounded border px-3 py-2 text-sm" value={cep} onChange={(e) => setCep(maskCEP(e.target.value))} placeholder="00000-000" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={handleCepLookup} className="w-full rounded bg-black px-3 py-2 text-white text-sm">Buscar CEP</button>
          </div>
          <div>
            <label className="block text-sm">Seu CNPJ (opcional)</label>
            <input className="w-full rounded border px-3 py-2 text-sm" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="col-span-2">
            <label className="block text-sm">Sua rua</label>
            <input className="w-full rounded border px-3 py-2" value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Número</label>
            <input className="w-full rounded border px-3 py-2 text-sm" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <label className="block text-sm">Seu bairro</label>
            <input className="w-full rounded border px-3 py-2" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Sua cidade</label>
            <input className="w-full rounded border px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">UF</label>
            <input className="w-full rounded border px-3 py-2 text-sm" value={uf} onChange={(e) => setUf(e.target.value)} placeholder="SP" />
          </div>
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded border px-4 py-2">Cancelar</button>
          )}
          <button disabled={loading || !isFormValid} type="submit" className="rounded bg-black px-4 py-2 text-white">{loading ? 'Enviando...' : 'Enviar cadastro'}</button>
        </div>
      </form>
    </div>
  );
}
