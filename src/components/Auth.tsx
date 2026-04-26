import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) alert(error.message)
    else alert('Login realizado com sucesso!')
    setLoading(false)
  }

  return (
    <div className="w-full">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2 text-left">
          <Label htmlFor="email">E-mail</Label>
          <Input 
            id="email"
            type="email" 
            placeholder="nome@exemplo.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 text-left">
          <Label htmlFor="password">Senha</Label>
          <Input 
            id="password"
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button disabled={loading} type="submit" className="w-full h-11 rounded-xl mt-6">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Acessar Sistema'
          )}
        </Button>
      </form>
    </div>
  )
}
