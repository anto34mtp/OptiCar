import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insuranceService } from '../services/api';

const TYPE_LABELS: Record<string, string> = {
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  SEMESTRIEL: 'Semestriel',
  ANNUEL: 'Annuel',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function InsuranceScreen({ route }: any) {
  const { vehicleId, vehicleName } = route.params;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', amount: '', type: 'MENSUEL', insurer: '', notes: '' });

  const { data: records, isLoading } = useQuery({
    queryKey: ['insurance', vehicleId],
    queryFn: () => insuranceService.getByVehicle(vehicleId),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => insuranceService.create(vehicleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', vehicleId] });
      setShowForm(false);
      setForm({ date: '', amount: '', type: 'MENSUEL', insurer: '', notes: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => insuranceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', vehicleId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => insuranceService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', vehicleId] }),
  });

  const handleSubmit = () => {
    if (!form.date || !form.amount) {
      Alert.alert('Erreur', 'Date et montant requis');
      return;
    }
    const payload = {
      date: new Date(form.date).toISOString(),
      amount: Number(form.amount),
      type: form.type,
      insurer: form.insurer || null,
      notes: form.notes || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const total = records?.reduce((s: number, r: any) => s + r.amount, 0) || 0;

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{vehicleName} - Assurance</Text>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total assurance</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => { setShowForm(!showForm); setEditingId(null); }}>
        <Text style={styles.addBtnText}>{showForm ? 'Annuler' : '+ Ajouter un paiement'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.formCard}>
          <TextInput style={styles.input} placeholder="Date (AAAA-MM-JJ)" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} />
          <TextInput style={styles.input} placeholder="Montant" keyboardType="numeric" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} />
          <View style={styles.typeRow}>
            {Object.keys(TYPE_LABELS).map((t) => (
              <TouchableOpacity key={t} style={[styles.typeBtn, form.type === t && styles.typeBtnActive]} onPress={() => setForm({ ...form, type: t })}>
                <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Assureur (optionnel)" value={form.insurer} onChangeText={(v) => setForm({ ...form, insurer: v })} />
          <TextInput style={styles.input} placeholder="Notes (optionnel)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>{editingId ? 'Modifier' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {records?.map((r: any) => (
        <View key={r.id} style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordDate}>{new Date(r.date).toLocaleDateString('fr-FR')}</Text>
            <Text style={styles.recordAmount}>{formatCurrency(r.amount)}</Text>
          </View>
          <Text style={styles.recordInfo}>
            {TYPE_LABELS[r.type] || r.type}{r.insurer ? ` · ${r.insurer}` : ''}
          </Text>
          {r.notes && <Text style={styles.recordNotes}>{r.notes}</Text>}
          <View style={styles.recordActions}>
            <TouchableOpacity onPress={() => {
              setEditingId(r.id);
              setForm({ date: r.date.split('T')[0], amount: String(r.amount), type: r.type, insurer: r.insurer || '', notes: r.notes || '' });
              setShowForm(true);
            }}>
              <Text style={styles.editText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              Alert.alert('Supprimer ?', '', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(r.id) },
              ]);
            }}>
              <Text style={styles.deleteText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  totalCard: { backgroundColor: '#f3e8ff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#d8b4fe' },
  totalLabel: { fontSize: 13, color: '#7c3aed' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: '#7c3aed', marginTop: 4 },
  addBtn: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#f3f4f6' },
  typeBtnActive: { backgroundColor: '#3b82f6' },
  typeBtnText: { fontSize: 12, color: '#374151' },
  typeBtnTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  recordCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  recordDate: { fontWeight: '600', color: '#111827' },
  recordAmount: { fontWeight: 'bold', color: '#7c3aed', fontSize: 16 },
  recordInfo: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  recordNotes: { fontSize: 12, color: '#9ca3af', marginTop: 2, fontStyle: 'italic' },
  recordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  editText: { color: '#3b82f6', fontSize: 13, fontWeight: '500' },
  deleteText: { color: '#dc2626', fontSize: 13, fontWeight: '500' },
});
