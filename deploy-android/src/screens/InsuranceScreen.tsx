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
import { useState, useMemo } from 'react';
import DatePickerModal from '../components/DatePickerModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { insuranceService } from '../services/api';
import { shadow } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', amount: '', type: 'MENSUEL', insurer: '', notes: '' });

  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: records, isLoading } = useQuery({
    queryKey: ['insurance', vehicleId],
    queryFn: () => insuranceService.getByVehicle(vehicleId),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => insuranceService.create(vehicleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', vehicleId] });
      setShowForm(false);
      setEditingId(null);
      setForm({ date: '', amount: '', type: 'MENSUEL', insurer: '', notes: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => insuranceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', vehicleId] });
      setEditingId(null);
      setShowForm(false);
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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Total card */}
      <View style={styles.totalCard}>
        <View style={styles.totalIconWrap}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.purple} />
        </View>
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Total assurance</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
        <Text style={styles.totalCount}>{records?.length || 0} paiement{(records?.length || 0) !== 1 ? 's' : ''}</Text>
      </View>

      {/* Add button */}
      <TouchableOpacity
        style={[styles.addBtn, showForm && !editingId && styles.addBtnCancel]}
        onPress={() => {
          if (showForm && !editingId) {
            setShowForm(false);
          } else {
            setEditingId(null);
            setForm({ date: '', amount: '', type: 'MENSUEL', insurer: '', notes: '' });
            setShowForm(true);
          }
        }}
      >
        <Ionicons
          name={showForm && !editingId ? 'close' : 'add-circle-outline'}
          size={18}
          color="#fff"
        />
        <Text style={styles.addBtnText}>
          {showForm && !editingId ? 'Annuler' : '+ Ajouter un paiement'}
        </Text>
      </TouchableOpacity>

      {/* Form card */}
      {showForm && (
        <View style={styles.formCard}>
          <View style={styles.formHandle} />
          <Text style={styles.formTitle}>{editingId ? 'Modifier le paiement' : 'Nouveau paiement'}</Text>

          <DatePickerModal
            visible={showDatePicker}
            value={form.date || new Date().toISOString().split('T')[0]}
            onConfirm={(d) => { setForm({ ...form, date: d }); setShowDatePicker(false); }}
            onCancel={() => setShowDatePicker(false)}
          />

          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={colors.purple} />
            <Text style={[styles.dateInputText, !form.date && { color: colors.textLight }]}>
              {form.date || 'Choisir une date'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Montant (€)</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="cash-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              placeholder="Ex: 89.50"
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: v })}
            />
            <Text style={styles.inputUnit}>€</Text>
          </View>

          <Text style={styles.fieldLabel}>Périodicité</Text>
          <View style={styles.typeRow}>
            {Object.keys(TYPE_LABELS).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                onPress={() => setForm({ ...form, type: t })}
              >
                <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>
                  {TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Assureur (optionnel)</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="business-outline" size={18} color={colors.textMid} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              placeholder="Ex: AXA, Maif..."
              placeholderTextColor={colors.textLight}
              value={form.insurer}
              onChangeText={(v) => setForm({ ...form, insurer: v })}
            />
          </View>

          <Text style={styles.fieldLabel}>Notes (optionnel)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Notes complémentaires..."
            placeholderTextColor={colors.textLight}
            value={form.notes}
            onChangeText={(v) => setForm({ ...form, notes: v })}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitBtn, (createMutation.isPending || updateMutation.isPending) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>{editingId ? 'Modifier' : 'Enregistrer'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Records list */}
      {records?.length === 0 && !showForm ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-outline" size={36} color={colors.textLight} />
          <Text style={styles.emptyText}>Aucun paiement enregistré</Text>
          <Text style={styles.emptySubText}>Ajoutez vos paiements d'assurance pour les suivre</Text>
        </View>
      ) : (
        records?.map((r: any) => (
          <View key={r.id} style={styles.recordCard}>
            <View style={styles.recordLeft}>
              <View style={styles.recordIconWrap}>
                <Ionicons name="shield-outline" size={18} color={colors.purple} />
              </View>
              <View style={styles.recordInfo}>
                <View style={styles.recordTopRow}>
                  <View style={styles.recordDateRow}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textLight} />
                    <Text style={styles.recordDate}>{new Date(r.date).toLocaleDateString('fr-FR')}</Text>
                  </View>
                  <View style={[styles.typeBadge]}>
                    <Text style={styles.typeBadgeText}>{TYPE_LABELS[r.type] || r.type}</Text>
                  </View>
                </View>
                {r.insurer && (
                  <Text style={styles.recordInsurer}>{r.insurer}</Text>
                )}
                {r.notes && (
                  <Text style={styles.recordNotes}>{r.notes}</Text>
                )}
              </View>
            </View>

            <View style={styles.recordRight}>
              <Text style={styles.recordAmount}>{formatCurrency(r.amount)}</Text>
              <View style={styles.recordActions}>
                <TouchableOpacity
                  style={styles.recordActionBtn}
                  onPress={() => {
                    setEditingId(r.id);
                    setForm({
                      date: r.date.split('T')[0],
                      amount: String(r.amount),
                      type: r.type,
                      insurer: r.insurer || '',
                      notes: r.notes || '',
                    });
                    setShowForm(true);
                  }}
                >
                  <Ionicons name="create-outline" size={14} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recordActionBtn, { backgroundColor: colors.dangerLight }]}
                  onPress={() => {
                    Alert.alert('Supprimer ce paiement ?', '', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(r.id) },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },

  // Total card
  totalCard: {
    backgroundColor: c.purpleLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.purple + '44',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...shadow.sm,
  },
  totalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalInfo: { flex: 1 },
  totalLabel: { fontSize: 12, color: c.purple, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 26, fontWeight: '800', color: c.purple, marginTop: 2 },
  totalCount: { fontSize: 12, color: c.purple, fontWeight: '500', opacity: 0.7 },

  // Add button
  addBtn: {
    backgroundColor: c.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...shadow.sm,
  },
  addBtnCancel: { backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Form card
  formCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 20,
    paddingTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.border,
    ...shadow.sm,
  },
  formHandle: {
    width: 36,
    height: 4,
    backgroundColor: c.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  formTitle: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textMid, marginBottom: 8, marginTop: 12 },

  // Date input
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    padding: 14,
  },
  dateInputText: { flex: 1, fontSize: 15, color: c.text, fontWeight: '500' },

  // Input with icon
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  inputInner: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15, color: c.text },
  inputUnit: { paddingRight: 14, fontSize: 14, color: c.textMid, fontWeight: '600' },

  // Text area
  textArea: {
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: c.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Type chips
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.background,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  typeChipActive: { backgroundColor: c.purpleLight, borderColor: c.purple },
  typeChipText: { fontSize: 12, color: c.textMid, fontWeight: '600' },
  typeChipTextActive: { color: c.purple, fontWeight: '700' },

  // Submit
  submitBtn: {
    backgroundColor: c.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...shadow.sm,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Empty
  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyText: { color: c.textMid, fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptySubText: { color: c.textLight, fontSize: 13, textAlign: 'center' },

  // Record cards
  recordCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    ...shadow.sm,
  },
  recordLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  recordIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: c.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: { flex: 1 },
  recordTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  recordDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recordDate: { fontWeight: '600', color: c.textMid, fontSize: 13 },
  typeBadge: {
    backgroundColor: c.purpleLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 10, color: c.purple, fontWeight: '700' },
  recordInsurer: { fontSize: 13, color: c.text, fontWeight: '500' },
  recordNotes: { fontSize: 12, color: c.textLight, marginTop: 2, fontStyle: 'italic' },

  // Record right side
  recordRight: { alignItems: 'flex-end', gap: 8 },
  recordAmount: { fontWeight: '800', color: c.purple, fontSize: 18 },
  recordActions: { flexDirection: 'row', gap: 6 },
  recordActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
