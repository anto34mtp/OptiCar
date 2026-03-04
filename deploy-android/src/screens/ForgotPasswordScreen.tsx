import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/api';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email),
    onSuccess: () => setSubmitted(true),
    onError: () => setError('Une erreur est survenue. Réessayez.'),
  });

  const handleSubmit = () => {
    setError('');
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Entrez votre email pour recevoir un lien de réinitialisation.
        </Text>

        {submitted ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Si cet email est enregistré, un lien vous a été envoyé. Vérifiez votre boîte mail
              (et les spams).
            </Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.backBtnText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Envoyer le lien</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginTop: 8, marginBottom: 32, lineHeight: 22 },
  form: { gap: 16 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, fontSize: 16 },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#3b82f6', fontSize: 14, fontWeight: '500', marginTop: 4 },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: 8, padding: 10 },
  successBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 20, alignItems: 'center', gap: 16 },
  successText: { fontSize: 14, color: '#166534', textAlign: 'center', lineHeight: 22 },
  backBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  backBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
});
