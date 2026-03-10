import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email),
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p className="text-gray-600 mt-2">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              Si cet email est enregistré, un lien de réinitialisation vous a été envoyé.
              Vérifiez votre boîte mail (et les spams).
            </div>
            <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  Une erreur est survenue. Réessayez.
                </div>
              )}
              <Input
                id="email"
                type="email"
                label="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="votre@email.com"
              />
              <Button type="submit" className="w-full" isLoading={mutation.isPending}>
                Envoyer le lien
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
