import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => authService.login({ email, password }),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    },
    onError: () => {
      setError('Email ou mot de passe incorrect');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
          <p className="text-gray-600 mt-2">Accédez à votre espace de suivi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <Input
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            type="password"
            label="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={loginMutation.isPending}
          >
            Se connecter
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">
            Mot de passe oublié ?
          </Link>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Créer un compte
          </Link>
        </p>
      </Card>
    </div>
  );
}
