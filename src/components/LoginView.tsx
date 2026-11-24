import React, { useState } from 'react';
import { Calculator, Lock, User as UserIcon, UserPlus, LogIn, Database, CheckCircle2 } from 'lucide-react';
import { authenticateUser, registerUser } from '../db';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      if (isRegisterMode) {
        const newUser = registerUser(username, password);
        setSuccessMsg(`Usuário "${newUser.username}" criado com sucesso!`);
        onLoginSuccess(newUser);
      } else {
        const user = authenticateUser(username, password);
        if (!user) {
          setError('Usuário ou senha inválidos. Tente admin / 123456 ou crie uma conta.');
          return;
        }
        onLoginSuccess(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-indigo-600 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamento Simples</h1>
          <p className="text-indigo-100 text-sm mt-1">
            Fichas Técnicas, Custos de Ingredientes e Calculadora de Lucro
          </p>
          <div className="inline-flex items-center gap-1.5 bg-indigo-700/70 text-indigo-100 text-xs px-3 py-1 rounded-full mt-3">
            <Database className="w-3.5 h-3.5" />
            <span>SQLite via SQL.js (WebAssembly Local)</span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError('');
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                !isRegisterMode
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setUsername('');
                setPassword('');
                setError('');
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                isRegisterMode
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Criar Usuário
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Usuário
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              {isRegisterMode ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Cadastrar e Entrar</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Acessar Sistema</span>
                </>
              )}
            </button>
          </form>

          {!isRegisterMode && (
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Acesso rápido padrão pré-cadastrado no SQLite:
              </p>
              <div className="mt-1.5 inline-flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-md text-xs text-slate-700 font-mono">
                <span>
                  Usuário: <strong>admin</strong>
                </span>
                <span>•</span>
                <span>
                  Senha: <strong>123456</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
