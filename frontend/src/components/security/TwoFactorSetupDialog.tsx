import { FormEvent, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { enableTwoFactor, setupTwoFactor } from '../../api/auth';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';

export function TwoFactorSetupDialog({
  open,
  onOpenChange,
  onEnabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setCode('');
    setError(null);
    setRecoveryCodes(null);
    setupTwoFactor()
      .then((data) => {
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setSecret(data.secret);
      })
      .catch((err) => setError(err?.response?.data?.message || 'Não foi possível iniciar a configuração.'))
      .finally(() => setLoading(false));
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await enableTwoFactor(code.trim());
      setRecoveryCodes(result.recoveryCodes);
      onEnabled();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Código inválido.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl">
          {recoveryCodes ? (
            <>
              <Dialog.Title className="mb-2 text-sm font-semibold text-slate-100">
                Guarde seus códigos de recuperação
              </Dialog.Title>
              <p className="mb-3 text-xs text-slate-400">
                Use um destes códigos para entrar se você perder acesso ao seu app autenticador. Cada um funciona uma
                única vez, e eles não serão mostrados de novo depois que você fechar esta janela.
              </p>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200">
                {recoveryCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Já salvei, concluir
              </Button>
            </>
          ) : (
            <>
              <Dialog.Title className="mb-4 text-sm font-semibold text-slate-100">
                Ativar autenticação de dois fatores
              </Dialog.Title>
              {loading ? (
                <Spinner />
              ) : (
                <form onSubmit={submit}>
                  <p className="mb-3 text-xs text-slate-400">
                    Escaneie o QR code com um app autenticador (Google Authenticator, Authy, etc.):
                  </p>
                  {qrCodeDataUrl && (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR code para configurar autenticação de dois fatores"
                      className="mx-auto mb-3 h-40 w-40 rounded bg-white p-2"
                    />
                  )}
                  <p className="mb-1 text-xs text-slate-400">Ou digite manualmente no app:</p>
                  <p className="mb-4 break-all rounded-md border border-slate-800 bg-slate-950 p-2 font-mono text-xs text-slate-300">
                    {secret}
                  </p>

                  <label className="mb-1 block text-xs text-slate-400">Código do app</label>
                  <input
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000000"
                    className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />

                  {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting || !code.trim()}>
                      {submitting ? 'Confirmando...' : 'Confirmar'}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
