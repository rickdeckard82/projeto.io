import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/common/Button';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/projects');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h1 className="mb-4 text-lg font-semibold text-slate-100">Entrar</h1>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <label className="mb-1 block text-xs text-slate-400">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <label className="mb-1 block text-xs text-slate-400">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-500">
          Não tem conta? <Link to="/register" className="text-indigo-400">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
