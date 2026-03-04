import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authService } from '../../services/auth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

function extractApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return resp.data.message;
    if (resp?.status === 400) return 'Ce lien est invalide, déjà utilisé ou expiré.';
  }
  return 'Une erreur est survenue. Réessayez.';
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [done, setDone] = useState(false);

  const tokenCheck = useQuery({
    queryKey: ['reset-token', token],
    queryFn: () => authService.checkResetToken(token),
    enabled: !!token,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => authService.resetPassword(token, password),
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError('');
    if (password.length < 6) {
      setFieldError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setFieldError('Les mots de passe ne correspondent pas.');
      return;
    }
    mutation.mutate();
  };

  const invalidBlock = (message: string) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {message}
        </div>
        <Link
          to="/forgot-password"
          className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          Demander un nouveau lien
        </Link>
      </Card>
    </div>
  );

  if (!token) return invalidBlock('Lien invalide ou manquant.');

  if (tokenCheck.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md text-center">
          <p className="text-gray-500 text-sm">Vérification du lien...</p>
        </Card>
      </div>
    );
  }

  if (tokenCheck.isError) {
    return invalidBlock(extractApiError(tokenCheck.error));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-gray-600 mt-2">Choisissez un nouveau mot de passe pour votre compte.</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              ✓ Mot de passe mis à jour. Redirection en cours...
            </div>
            <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Se connecter maintenant
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {fieldError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {fieldError}
              </div>
            )}
            <Input
              id="password"
              type="password"
              label="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Minimum 6 caractères"
            />
            <Input
              id="confirm"
              type="password"
              label="Confirmer le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Répétez le mot de passe"
            />
            <Button type="submit" className="w-full" isLoading={mutation.isPending}>
              Réinitialiser le mot de passe
            </Button>
            <p className="text-center text-sm text-gray-600 mt-2">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
