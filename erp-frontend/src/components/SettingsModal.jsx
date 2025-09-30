import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsModal({ isOpen, onClose, isDark, setIsDark, storeName, setStoreName }) {
  const [localName, setLocalName] = useState(storeName || "");
  const { signOut } = useAuth();

  useEffect(() => {
    if (isOpen) setLocalName(storeName || "");
  }, [isOpen, storeName]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      window.localStorage.setItem("erp-store-name", localName || "");
      window.localStorage.setItem("erp-client-name", localName || "");
    } catch (e) {
      // ignore localStorage errors
    }
    if (setStoreName) setStoreName(localName || "");
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg dark:bg-surface-dark">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Configurações</h3>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <XMarkIcon className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
          <div>
            <label className="block text-sm text-neutral-600">Nome da loja</label>
            <input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Nome da loja (opcional)"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600">Tema</label>
            <div className="mt-2 flex items-center gap-3">
              <button type="button" onClick={() => setIsDark(false)} className={`rounded-full border px-3 py-2 ${!isDark ? "bg-black text-white" : ""}`}>
                Dia
              </button>
              <button type="button" onClick={() => setIsDark(true)} className={`rounded-full border px-3 py-2 ${isDark ? "bg-black text-white" : ""}`}>
                Noite
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { signOut(); if (onClose) onClose(); }} className="rounded-full border px-4 py-2 text-sm text-red-600">
              Sair
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="rounded-full border px-4 py-2">Cancelar</button>
            <button onClick={handleSave} className="rounded-full bg-black px-4 py-2 text-white">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
