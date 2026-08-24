import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl, Text, SafeAreaView, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { kyc, COLORS, SPACING, RADIUS, GRADIENTS, SHADOWS } from '@easyryde/shared';
import type { KycVerification } from '@easyryde/shared';

let ImagePicker: typeof import('expo-image-picker') | null = null;
const getImagePicker = async () => {
  if (!ImagePicker) {
    ImagePicker = require('expo-image-picker');
  }
  return ImagePicker;
};

type DocumentType = 'drivers_license' | 'vehicle_registration' | 'insurance' | 'psv_license';
type DocumentDef = { id: DocumentType; label: string; icon: keyof typeof Ionicons.glyphMap; verificationType: string; kycDocType: string; needsBack: boolean };

const DOCUMENT_TYPES: DocumentDef[] = [
  { id: 'drivers_license', label: "Driver's License", icon: 'card', verificationType: 'license', kycDocType: 'drivers_license', needsBack: false },
  { id: 'vehicle_registration', label: 'Vehicle Registration', icon: 'document-text', verificationType: 'vehicle', kycDocType: 'drivers_license', needsBack: false },
  { id: 'insurance', label: 'Vehicle Insurance', icon: 'shield-checkmark', verificationType: 'vehicle', kycDocType: 'drivers_license', needsBack: false },
  { id: 'psv_license', label: 'Professional Driving Permit', icon: 'ribbon', verificationType: 'identity', kycDocType: 'id_card', needsBack: true },
];

type VerificationMap = Record<string, KycVerification>;

function getStatusColor(status: string) { switch (status) { case 'approved': return COLORS.primary; case 'rejected': return COLORS.red; case 'pending': case 'under_review': return COLORS.amber; case 'expired': return COLORS.red; default: return COLORS.muted; } }
function getStatusLabel(status: string) { switch (status) { case 'approved': return 'Approved'; case 'rejected': return 'Rejected'; case 'pending': return 'Pending'; case 'under_review': return 'Under Review'; case 'expired': return 'Expired'; default: return 'Not Uploaded'; } }
function getStatusIcon(status: string): keyof typeof Ionicons.glyphMap { switch (status) { case 'approved': return 'checkmark-circle'; case 'rejected': return 'close-circle'; case 'pending': return 'time'; case 'under_review': return 'search'; case 'expired': return 'alert-circle'; default: return 'cloud-upload-outline'; } }

export default function DocumentsScreen({ navigation }: { navigation: any }) {
  const [verifications, setVerifications] = useState<VerificationMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadModal, setUploadModal] = useState<DocumentDef | null>(null);
  const [documentNumber, setDocumentNumber] = useState('');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  const loadVerifications = useCallback(async () => { try { const response = await kyc.myVerifications(); const verificationsList = response?.verifications ?? (response as any)?.data?.verifications ?? []; const map: VerificationMap = {}; for (const v of verificationsList) { const key = v.verification_type; if (!map[key] || v.status === 'approved') map[key] = v; } setVerifications(map); } catch (e: any) { if (__DEV__) console.warn('[Documents] loadVerifications error:', e.message); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { loadVerifications(); }, [loadVerifications]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadVerifications(); }, [loadVerifications]);

  const pickImage = async (setUri: (uri: string | null) => void) => { const Picker = await getImagePicker(); const { status } = await Picker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant photo library access to upload documents.'); return; } const result = await Picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true }); if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri); };
  const takePhoto = async (setUri: (uri: string | null) => void) => { const Picker = await getImagePicker(); const { status } = await Picker.requestCameraPermissionsAsync(); if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant camera access to take a photo.'); return; } const result = await Picker.launchCameraAsync({ quality: 0.8, allowsEditing: true }); if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri); };
  const showImageOptions = (setUri: (uri: string | null) => void) => { Alert.alert('Select Document', 'Choose how to provide the document image', [{ text: 'Take Photo', onPress: () => takePhoto(setUri) }, { text: 'Choose from Library', onPress: () => pickImage(setUri) }, { text: 'Cancel', style: 'cancel' }]); };

  const handleUpload = async () => {
    if (!uploadModal) return;
    if (!frontUri) { Alert.alert('Error', 'Please select a front image.'); return; }
    if (!documentNumber.trim()) { Alert.alert('Error', 'Please enter a document number.'); return; }
    setUploading(uploadModal.id);
    try {
      const frontFile = { uri: frontUri, type: 'image/jpeg', name: 'document_front.jpg' } as any;
      let backFile: any = undefined;
      if (uploadModal.needsBack && backUri) backFile = { uri: backUri, type: 'image/jpeg', name: 'document_back.jpg' } as any;
      await kyc.submit({ verification_type: uploadModal.verificationType, document_type: uploadModal.kycDocType, document_number: documentNumber.trim(), document_front: frontFile, document_back: backFile });
      Alert.alert('Success', 'Document submitted for review.');
      setUploadModal(null); setDocumentNumber(''); setFrontUri(null); setBackUri(null); loadVerifications();
    } catch (e: any) { Alert.alert('Upload Failed', e.message || 'Something went wrong. Please try again.'); } finally { setUploading(null); }
  };

  const openUploadModal = (doc: DocumentDef) => { setDocumentNumber(''); setFrontUri(null); setBackUri(null); setUploadModal(doc); };
  const getDocStatus = (doc: DocumentDef) => { const v = verifications[doc.verificationType]; if (!v) return null; return v; };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Loading documents...</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
        <LinearGradient colors={GRADIENTS.primary} style={styles.headerGradient}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Documents</Text>
          <Text style={styles.headerSubtitle}>Upload & manage your verification documents</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>All documents are reviewed within 24-48 hours. Make sure images are clear and legible.</Text>
          </View>

          {DOCUMENT_TYPES.map((doc) => {
            const verification = getDocStatus(doc);
            const status = verification?.status ?? 'none';
            const statusColor = getStatusColor(status);
            const isUploading = uploading === doc.id;
            return (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docHeader}>
                  <View style={[styles.docIcon, { backgroundColor: `${statusColor}25` }]}><Ionicons name={doc.icon} size={22} color={statusColor} /></View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docLabel}>{doc.label}</Text>
                    {verification?.document_number ? <Text style={styles.docNumber}>#{verification.document_number}</Text> : null}
                    {verification?.expires_at ? <Text style={styles.docExpiry}>Expires: {new Date(verification.expires_at).toLocaleDateString()}</Text> : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Ionicons name={getStatusIcon(status)} size={14} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(status)}</Text>
                  </View>
                </View>
                {verification?.rejection_reason ? <View style={styles.rejectionRow}><Ionicons name="alert-circle" size={14} color={COLORS.red} /><Text style={styles.rejectionText}>{verification.rejection_reason}</Text></View> : null}
                {verification?.created_at ? <Text style={styles.uploadDate}>Submitted: {new Date(verification.created_at).toLocaleDateString()}</Text> : null}
                {(status === 'none' || status === 'rejected' || status === 'expired') && (
                  <TouchableOpacity style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]} onPress={() => openUploadModal(doc)} disabled={isUploading} activeOpacity={0.7}>
                    {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name={status === 'rejected' ? 'refresh' : 'cloud-upload'} size={18} color="#fff" /><Text style={styles.uploadBtnText}>{status === 'rejected' ? 'Re-upload' : 'Upload'}</Text></>}
                  </TouchableOpacity>
                )}
                {status === 'approved' && <View style={styles.approvedRow}><Ionicons name="checkmark-circle" size={16} color={COLORS.primary} /><Text style={styles.approvedText}>Document verified</Text></View>}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!uploadModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Upload {uploadModal?.label}</Text><TouchableOpacity onPress={() => setUploadModal(null)}><Ionicons name="close" size={24} color={COLORS.muted} /></TouchableOpacity></View>
            <Text style={styles.modalLabel}>Document Number</Text>
            <TextInput placeholder="Enter document number" placeholderTextColor={COLORS.muted} value={documentNumber} onChangeText={setDocumentNumber} style={styles.modalInput} />
            <Text style={styles.modalLabel}>Document Front</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => showImageOptions(setFrontUri)} activeOpacity={0.7}>
              {frontUri ? <View style={styles.imagePreview}><Ionicons name="image" size={32} color={COLORS.primary} /><Text style={styles.imagePreviewText}>Image selected</Text></View> : <View style={styles.imagePlaceholder}><Ionicons name="camera-outline" size={32} color={COLORS.muted} /><Text style={styles.imagePlaceholderText}>Tap to select front image</Text></View>}
            </TouchableOpacity>
            {uploadModal?.needsBack && (<><Text style={styles.modalLabel}>Document Back</Text><TouchableOpacity style={styles.imagePicker} onPress={() => showImageOptions(setBackUri)} activeOpacity={0.7}>{backUri ? <View style={styles.imagePreview}><Ionicons name="image" size={32} color={COLORS.primary} /><Text style={styles.imagePreviewText}>Image selected</Text></View> : <View style={styles.imagePlaceholder}><Ionicons name="camera-outline" size={32} color={COLORS.muted} /><Text style={styles.imagePlaceholderText}>Tap to select back image</Text></View>}</TouchableOpacity></>)}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUploadModal(null)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, uploading && styles.modalSubmitBtnDisabled]} onPress={handleUpload} disabled={!!uploading}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.modalSubmitGradient}>{uploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSubmitText}>Submit</Text>}</LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'Inter_500Medium', color: COLORS.muted, marginTop: 12, fontSize: 14 },
  headerGradient: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'] },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 8 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: '#fff' },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { padding: SPACING.base },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.brandLightBg, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: 'rgba(10,124,78,0.2)', marginBottom: 16 },
  infoText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.primary, lineHeight: 18 },
  docCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.line, marginBottom: 12, ...SHADOWS.subtle },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: COLORS.ink },
  docNumber: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.muted, marginTop: 2 },
  docExpiry: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textDim, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  rejectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: COLORS.errorGlow, borderRadius: RADIUS.sm, padding: 10 },
  rejectionText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.red, lineHeight: 16 },
  uploadDate: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textDim, marginTop: 10 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 12, marginTop: 12 },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' },
  approvedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: COLORS.brandLightBg, borderRadius: RADIUS.sm, padding: 10 },
  approvedText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: COLORS.primary },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 24, paddingBottom: 40, ...SHADOWS.elevated },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: COLORS.ink },
  modalLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.muted, marginBottom: 8, marginTop: 4 },
  modalInput: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.line, borderRadius: RADIUS.md, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 16, color: COLORS.ink, marginBottom: 12 },
  imagePicker: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.line, borderRadius: RADIUS.md, height: 120, marginBottom: 12, overflow: 'hidden' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  imagePlaceholderText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.muted },
  imagePreview: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: COLORS.brandLightBg },
  imagePreviewText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceLight },
  modalCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: COLORS.muted },
  modalSubmitBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  modalSubmitBtnDisabled: { opacity: 0.6 },
  modalSubmitGradient: { padding: 14, alignItems: 'center' },
  modalSubmitText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
});
