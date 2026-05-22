import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { logger } from '../lib/logger'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  const traduzirErro = (msg: string) => {
    // Erros de autenticação
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'E-mail não confirmado. Verifique sua caixa de entrada.';
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado. Faça o login.';
    // Erros de senha
    if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('password')) return 'Erro na senha: ' + msg;
    // Erros de rate limit
    if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (msg.includes('For security purposes')) return 'Por segurança, aguarde alguns segundos antes de tentar novamente.';
    // Erros de rede/servidor
    if (msg.includes('fetch') || msg.includes('network')) return 'Erro de conexão. Verifique sua internet.';
    if (msg.includes('500') || msg.includes('server')) return 'Erro interno do servidor. Tente novamente em instantes.';
    // Fallback: retorna o original
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    logger.debug(isLogin ? 'Tentativa de login iniciada.' : 'Tentativa de cadastro iniciada.')
    setLoading(true)
    setMessage(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          logger.warn('Falha no login.')
          setMessage({ type: 'error', text: traduzirErro(error.message) })
        } else {
          logger.info('Login concluido.')
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) {
          logger.warn('Falha no cadastro.')
          setMessage({ type: 'error', text: traduzirErro(error.message) })
        } else if (data?.user?.identities?.length === 0) {
          setMessage({ type: 'error', text: 'Este e-mail já está cadastrado. Faça o login.' })
        } else {
          logger.info('Cadastro concluido.')
          setMessage({ type: 'success', text: 'Conta criada com sucesso! Você já foi logado automaticamente.' })
        }
      }
    } catch {
      logger.warn('Falha inesperada na autenticacao.')
      setMessage({ type: 'error', text: 'Ocorreu um erro inesperado. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isLogin ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          onClick={() => { setIsLogin(true); setMessage(null); }}
        >
          Entrar
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!isLogin ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          onClick={() => { setIsLogin(false); setMessage(null); }}
        >
          Criar Conta
        </button>
      </div>

      {message && (
        <div className={`p-4 mb-6 rounded-xl flex items-start gap-3 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-green-50 text-green-800 border border-green-100'}`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 text-left">
          <Label htmlFor="email">E-mail</Label>
          <Input 
            id="email"
            type="email" 
            placeholder="nome@exemplo.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2 text-left">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input 
              id="password"
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required

              className="rounded-xl pr-10"
            />
            <button 
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button disabled={loading} type="submit" className="w-full h-11 rounded-xl mt-6 transition-all">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isLogin ? 'Entrando...' : 'Criando...'}
            </>
          ) : (
            isLogin ? 'Acessar Sistema' : 'Criar Nova Conta'
          )}
        </Button>
      </form>
    </div>
  )
}
