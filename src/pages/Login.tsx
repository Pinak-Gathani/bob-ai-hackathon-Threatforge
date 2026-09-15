import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, Activity, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('analyst@threatlens.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-wider">THREATLENS</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono font-bold border border-cyan-800/60">
              AI
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            AI-Powered Threat Intelligence Command Center
          </p>
        </div>

        {/* Demo Environment Badge */}
        <div className="mb-6 p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-semibold">Hackathon Demo Environment</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-900/60">
            D2 Challenge
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Analyst Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-75"
          >
            {isLoading ? (
              <span>Authenticating Analyst...</span>
            ) : (
              <>
                <span>Sign In to Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Footer */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-500 mb-2">Instant Demo Evaluation Access</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center justify-center space-x-1 mx-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Launch Pre-authenticated SOC Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
