import { useState, useEffect } from "react";
import useConfirm from '../hooks/useConfirm';
import { uploadProductPhotos, deleteProductPhoto, updateProduct } from "../lib/api";
import { digitsFromValue, digitsFromString, formatFromDigits, numberFromDigits, defaultLocale, defaultCurrency } from "../lib/format";

const initialForm = {
  name: "",
  supplier: "",
  sku: "",
  category: "",
  cost_price: "",
  sale_price: "",
  min_stock: "0",
  stock: "0", // Estoque atual
  photos: [], // Fotos existentes
};

export default function ProductCreateModal({ onClose, onSubmit, loading = false, error = "", initialData = null, onProductSaved }) {
  // Keep both human-friendly form values and internal digit buffers for currency
  const [form, setForm] = useState(initialData ? {
    ...initialForm,
    ...initialData,
    cost_price: initialData.cost_price ?? "",
    sale_price: initialData.sale_price ?? "",
    min_stock: initialData.min_stock ?? "0",
    stock: initialData.stock ?? "0",
    photos: initialData.photos ?? [],
  } : initialForm);
  const [costDigits, setCostDigits] = useState(digitsFromValue(initialData?.cost_price ?? ""));
  const [saleDigits, setSaleDigits] = useState(digitsFromValue(initialData?.sale_price ?? ""));
  const [files, setFiles] = useState([]);
  const [removedPhotos, setRemovedPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [confirm, ConfirmElement] = useConfirm();
  const [stockChangeConfirmed, setStockChangeConfirmed] = useState(false);

  // Excluir foto existente
  const handleRemovePhoto = (photo) => {
    // If it's a string (already uploaded photo), call API to delete it immediately
    if (typeof photo === "string" && initialData?.id) {
      // optimistic UI update
      setForm((current) => ({
        ...current,
        photos: current.photos.filter((p) => p !== photo),
      }));
      deleteProductPhoto(initialData.id, photo).catch((err) => {
        // revert on error
        setForm((current) => ({ ...current, photos: [...current.photos, photo] }));
        setPhotoError(err?.message || "Falha ao excluir foto");
      });
      return;
    }

    // If it's a File (pending), remove from files state
    if (photo instanceof File) {
      setFiles((prev) => prev.filter((f) => f !== photo));
      return;
    }

    // fallback: remove by value from form.photos
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((p) => p !== photo),
    }));
  };

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Currency input handlers using digit buffers
  const handleCurrencyInput = (field, digits, setDigits) => {
    // digits: string containing only digits (centavos)
    setDigits(digits);
    const display = formatFromDigits(digits, defaultLocale, defaultCurrency);
    setForm((cur) => ({ ...cur, [field]: display }));
  };

  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  // reset stock confirmation when initialData changes (modal opened for different product)
  useEffect(() => {
    setStockChangeConfirmed(false);
  }, [initialData]);

  const handleStockFocus = async (event) => {
    if (stockChangeConfirmed) return;
    // ask once whether user intends to change stock
    const ok = await confirm({
      title: 'Confirmar alteração de estoque',
      message: `Tem certeza que deseja alterar o estoque de ${form.stock}? Ao confirmar, você poderá editar o valor.`,
      confirmLabel: 'Sim, alterar',
      cancelLabel: 'Cancelar',
    });
    if (ok) {
      setStockChangeConfirmed(true);
    } else {
      try { event.target.blur(); } catch (e) {}
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      return;
    }
    // Convert currency digit buffers to numeric values (float)
    const data = {
      ...form,
      cost_price: numberFromDigits(costDigits),
      sale_price: numberFromDigits(saleDigits),
      // ensure numeric fields are numbers (not strings)
      stock: Number.parseInt(form.stock || 0, 10),
      min_stock: Number.parseInt(form.min_stock || 0, 10),
    };
    setPhotoError("");
    setUploadingPhotos(false);
    try {
  // Cria ou atualiza produto
  const product = await onSubmit(data, files);
      // Upload de fotos novas
      if (files.length > 0 && product?.id) {
        setUploadingPhotos(true);
        const updatedProduct = await uploadProductPhotos(product.id, files);
        setForm((current) => ({
          ...current,
          photos: updatedProduct.photos || [],
        }));
        setUploadingPhotos(false);
        if (onProductSaved) onProductSaved(updatedProduct);
      } else {
        if (onProductSaved) onProductSaved(product);
      }
      resetAndClose();
    } catch (err) {
      setPhotoError(err?.message || "Erro ao salvar produto ou fotos.");
      setUploadingPhotos(false);
    }
  };

  const resetAndClose = () => {
    setForm(initialData ? {
      ...initialForm,
      ...initialData,
      cost_price: initialData.cost_price ?? "",
      sale_price: initialData.sale_price ?? "",
      min_stock: initialData.min_stock ?? "0",
      stock: initialData.stock ?? "0",
      photos: initialData.photos ?? [],
    } : initialForm);
    setFiles([]);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
  <div className="w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white px-6 py-6 shadow-xl dark:border-white/10 dark:bg-surface-dark">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Cadastrar novo produto</h3>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-full border border-white/20 p-2 text-text-light/60 dark:text-text-dark/60 transition hover:border-white/40 dark:hover:border-white/40 hover:text-text-light dark:hover:text-text-dark"
          >
            Fechar
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-black dark:text-neutral-300">
              Nome*
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                className="w-full rounded-2xl border border-black dark:border-white bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-black dark:focus:border-white focus:outline-none"
                required
              />
            </label>
            <label className="space-y-2 text-sm text-black dark:text-neutral-300">
              Fornecedor
              <input
                type="text"
                value={form.supplier}
                onChange={(event) => handleChange("supplier", event.target.value)}
                className="w-full rounded-2xl border border-black dark:border-white bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-black dark:focus:border-white focus:outline-none"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-black dark:text-neutral-300">
              SKU*
              <input
                type="text"
                value={form.sku}
                onChange={(event) => handleChange("sku", event.target.value)}
                className="w-full rounded-2xl border border-black dark:border-white bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-black dark:focus:border-white focus:outline-none"
                required
              />
            </label>
            <label className="space-y-2 text-sm text-black dark:text-neutral-300">
              Categoria
              <input
                type="text"
                value={form.category}
                onChange={(event) => handleChange("category", event.target.value)}
                className="w-full rounded-2xl border border-black dark:border-white bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-black dark:focus:border-white focus:outline-none"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2 text-sm text-black dark:text-neutral-300">
              Custo (R$)
              <input
                type="text"
                inputMode="numeric"
                value={form.cost_price ? form.cost_price : formatFromDigits(costDigits, defaultLocale, defaultCurrency)}
                onChange={(e) => {
                  const d = digitsFromString(e.target.value);
                  handleCurrencyInput('cost_price', d, setCostDigits);
                }}
                className="w-full rounded-2xl border border-black dark:border-white bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-black dark:focus:border-white focus:outline-none"
              />
            </label>
            <label className="space-y-2 text-sm text-black dark:text-neutral-300">
              Preço de venda (R$)
              <input
                type="text"
                inputMode="numeric"
                value={form.sale_price ? form.sale_price : formatFromDigits(saleDigits, defaultLocale, defaultCurrency)}
                onChange={(e) => {
                  const d = digitsFromString(e.target.value);
                  handleCurrencyInput('sale_price', d, setSaleDigits);
                }}
                className="w-full rounded-2xl border border-black dark:border-white bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-black dark:focus:border-white focus:outline-none"
              />
            </label>
            <div className="space-y-2 text-sm text-black dark:text-neutral-300">
              <span className="block">Margem (R$)</span>
              <div className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark">
                {(() => {
                  const cost = numberFromDigits(costDigits);
                  const sale = numberFromDigits(saleDigits);
                  const m = (sale || 0) - (cost || 0);
                  return (m || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                })()}
              </div>
            </div>
            <label className="space-y-2 text-sm text-black dark:text-neutral-300">
              Estoque mínimo
              <input
                type="number"
                min="0"
                value={form.min_stock}
                onChange={(event) => handleChange("min_stock", event.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-white/60 focus:outline-none"
              />
            </label>
            <label className="space-y-2 text-sm text-black dark:text-neutral-300">
              Estoque atual
              <input
                type="number"
                min="0"
                value={form.stock}
                onFocus={handleStockFocus}
                onChange={(event) => {
                  handleChange("stock", event.target.value);
                }}
                className="w-full rounded-2xl border border-black dark:border-white bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-black dark:focus:border-white focus:outline-none"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm text-black dark:text-neutral-300">
            Foto do produto
            <div className="flex gap-2 flex-wrap mb-2">
              {/* existing uploaded photos */}
              {form.photos && form.photos.length > 0 && form.photos.map((photo, idx) => (
                <div key={`exist-${idx}`} className="relative group">
                  <img src={typeof photo === 'string' ? photo : photo} alt="Foto" className="h-48 w-48 rounded-xl object-cover border" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-80 group-hover:opacity-100"
                  >Excluir</button>
                </div>
              ))}

              {/* pending new files previews */}
              {files && files.length > 0 && files.map((file, idx) => (
                <div key={`new-${idx}`} className="relative group">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-48 w-48 rounded-xl object-cover border" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(file)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-80 group-hover:opacity-100"
                  >Remover</button>
                </div>
              ))}
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleFileChange}
              className="w-full rounded-2xl border border-black dark:border-white bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-black dark:focus:border-white focus:outline-none"
            />
            <p className="text-xs text-neutral-500">Formatos aceitos: JPG, PNG, WEBP (convertidos automaticamente para WEBP).</p>
            {uploadingPhotos && (
              <p className="text-xs text-blue-500">Enviando fotos...</p>
            )}
            {photoError && (
              <p className="text-xs text-red-500">{photoError}</p>
            )}
          </label>

          {error && (
            <p className="rounded-2xl border border-red-400/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-full border border-white/20 px-4 py-2 text-sm uppercase tracking-[0.25em] text-neutral-300 transition hover:border-white/40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full border border-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:-translate-y-0.5 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
          {ConfirmElement}
        </form>
      </div>
    </div>
  );
}

