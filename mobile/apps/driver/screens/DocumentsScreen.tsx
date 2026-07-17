import React, { useState, useEffect, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl,
  Text, SafeAreaView, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { kyc, COLORS, SPACING, RADIUS } from '@easyryde/shared';
import type { KycVerification } from '@easyryde/shared';

type DocumentType = 'drivers_license' | 'vehicle_registration' | 'insurance' | 'psv_license';

type DocumentDef = {
  id: DocumentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  verificationType: string;
  kycDocType: string;
  needsBack: boolean;
};

const DOCUMENT_TYPES: DocumentDef[] = [
  {
    id: 'drivers_license',
    label: "Driver's License",
    icon: 'card',
    verificationType: 'license',
    kycDocType: 'drivers_license',
    needsBack: false,
  },
  {
    id: 'vehicle_registration',
    label: 'Vehicle Registration',
    icon: 'document-text',
    verificationType: 'vehicle',
    kycDocType: 'drivers_license',
    needsBack: false,
  },
  {
    id: 'insurance',
    label: 'Vehicle Insurance',
    icon: 'shield-checkmark',
    verificationType: 'vehicle',
    kycDocType: 'drivers_license',
    needsBack: false,
  },
  {
    id: 'psv_license',
    label: 'Professional Driving Permit',
    icon: 'ribbon',
    verificationType: 'identity',
    kycDocType: 'id_card',
    needsBack: true,
  },
];

type VerificationMap = Record<string, KycVerification>;

function getStatusColor(status: string) {
  switch (status) {
    case 'approved': return COLORS.success;
    case 'rejected': return COLORS.errorLight;
    case 'pending':
    case 'under_review': return COLORS.primary;
    case 'expired': return COLORS.warning;
    default: return COLORS.textMuted;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'pending': return 'Pending';
    case 'under_review': return 'Under Review';
    case 'expired': return 'Expired';
    default: return 'Not Uploaded';
  }
}

function getStatusIcon(status: string): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'approved': return 'checkmark-circle';
    case 'rejected': return 'close-circle';
    case 'pending': return 'time';
    case 'under_review': return 'search';
    case 'expired': return 'alert-circle';
    default: return 'cloud-upload-outline';
  }
}

export default function DocumentsScreen({ navigation }: { navigation: any }) {
  const [verifications, setVerifications] = useState<VerificationMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadModal, setUploadModal] = useState<DocumentDef | null>(null);
  const [documentNumber, setDocumentNumber] = useState('');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  const loadVerifications = useCallback(async () => {
    try {
      const response = await kyc.myVerifications();
      const verificationsList = response?.verifications ?? (response as any)?.data?.verifications ?? [];
      const map: VerificationMap = {};
      for (const v of verificationsList) {
        const key = v.verification_type;
        if (!map[key] || v.status === 'approved') {
          map[key] = v;
        }
      }
      setVerifications(map);
    } catch (e: any) {
      if (__DEV__) console.warn('[Documents] loadVerifications error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVerifications();
  }, [loadVerifications]);

  const pickImage = async (setUri: (uri: string | null) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to upload documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
    }
  };

  const takePhoto = async (setUri: (uri: string | null) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
    }
  };

  const showImageOptions = (setUri: (uri: string | null) => void) => {
    Alert.alert('Select Document', 'Choose how to provide the document image', [
      { text: 'Take Photo', onPress: () => takePhoto(setUri) },
      { text: 'Choose from Library', onPress: () => pickImage(setUri) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUpload = async () => {
    if (!uploadModal) return;
    if (!frontUri) {
      Alert.alert('Error', 'Please select a front image.');
      return;
    }
    if (!documentNumber.trim()) {
      Alert.alert('Error', 'Please enter a document number.');
      return;
    }

    setUploading(uploadModal.id);
    try {
      const frontFile = {
        uri: frontUri,
        type: 'image/jpeg',
        name: 'document_front.jpg',
      } as any;

      let backFile: any = undefined;
      if (uploadModal.needsBack && backUri) {
        backFile = {
          uri: backUri,
          type: 'image/jpeg',
          name: 'document_back.jpg',
        } as any;
      }

      await kyc.submit({
        verification_type: uploadModal.verificationType,
        document_type: uploadModal.kycDocType,
        document_number: documentNumber.trim(),
        document_front: frontFile,
        document_back: backFile,
      });

      Alert.alert('Success', 'Document submitted for review.');
      setUploadModal(null);
      setDocumentNumber('');
      setFrontUri(null);
      setBackUri(null);
      loadVerifications();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const openUploadModal = (doc: DocumentDef) => {
    setDocumentNumber('');
    setFrontUri(null);
    setBackUri(null);
    setUploadModal(doc);
  };

  const getDocStatus = (doc: DocumentDef) => {
    const v = verifications[doc.verificationType];
    if (!v) return null;
    return v;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.success} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.success} />}
      >
        <LinearGradient colors={[COLORS.success, '#15803d']} style={styles.headerGradient}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Documents</Text>
          <Text style={styles.headerSubtitle}>Upload & manage your verification documents</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              All documents are reviewed within 24-48 hours. Make sure images are clear and legible.
            </Text>
          </View>

          {DOCUMENT_TYPES.map((doc) => {
            const verification = getDocStatus(doc);
            const status = verification?.status ?? 'none';
            const statusColor = getStatusColor(status);
            const isUploading = uploading === doc.id;

            return (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docHeader}>
                  <View style={[styles.docIcon, { backgroundColor: `${statusColor}25` }]}>
                    <Ionicons name={doc.icon} size={22} color={statusColor} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docLabel}>{doc.label}</Text>
                    {verification?.document_number ? (
                      <Text style={styles.docNumber}>#{verification.document_number}</Text>
                    ) : null}
                    {verification?.expires_at ? (
                      <Text style={styles.docExpiry}>
                        Expires: {new Date(verification.expires_at).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Ionicons name={getStatusIcon(status)} size={14} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {getStatusLabel(status)}
                    </Text>
                  </View>
                </View>

                {verification?.rejection_reason ? (
                  <View style={styles.rejectionRow}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.errorLight} />
                    <Text style={styles.rejectionText}>{verification.rejection_reason}</Text>
                  </View>
                ) : null}

                {verification?.created_at ? (
                  <Text style={styles.uploadDate}>
                    Submitted: {new Date(verification.created_at).toLocaleDateString()}
                  </Text>
                ) : null}

                {(status === 'none' || status === 'rejected' || status === 'expired') && (
                  <TouchableOpacity
                    style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]}
                    onPress={() => openUploadModal(doc)}
                    disabled={isUploading}
                    activeOpacity={0.7}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name={status === 'rejected' ? 'refresh' : 'cloud-upload'} size={18} color="#fff" />
                        <Text style={styles.uploadBtnText}>
                          {status === 'rejected' ? 'Re-upload' : 'Upload'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {status === 'approved' && (
                  <View style={styles.approvedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.approvedText}>Document verified</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!uploadModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload {uploadModal?.label}</Text>
              <TouchableOpacity onPress={() => setUploadModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Document Number</Text>
            <TextInput
              placeholder="Enter document number"
              placeholderTextColor="#666"
              value={documentNumber}
              onChangeText={setDocumentNumber}
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Document Front</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => showImageOptions(setFrontUri)} activeOpacity={0.7}>
              {frontUri ? (
                <View style={styles.imagePreview}>
                  <Ionicons name="image" size={32} color={COLORS.success} />
                  <Text style={styles.imagePreviewText}>Image selected</Text>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={COLORS.textMuted} />
                  <Text style={styles.imagePlaceholderText}>Tap to select front image</Text>
                </View>
              )}
            </TouchableOpacity>

            {uploadModal?.needsBack && (
              <>
                <Text style={styles.modalLabel}>Document Back</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={() => showImageOptions(setBackUri)} activeOpacity={0.7}>
                  {backUri ? (
                    <View style={styles.imagePreview}>
                      <Ionicons name="image" size={32} color={COLORS.success} />
                      <Text style={styles.imagePreviewText}>Image selected</Text>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={COLORS.textMuted} />
                      <Text style={styles.imagePlaceholderText}>Tap to select back image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUploadModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, uploading && styles.modalSubmitBtnDisabled]}
                onPress={handleUpload}
                disabled={!!uploading}
              >
                <LinearGradient colors={[COLORS.success, '#15803d']} style={styles.modalSubmitGradient}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },

  headerGradient: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'],
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  content: { padding: SPACING.base },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(255, 173, 122, 0.1)', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255, 173, 122, 0.2)', marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 18 },

  docCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.surfaceBorder, marginBottom: 12,
  },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center',
  },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  docNumber: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  docExpiry: { fontSize: 12, color: COLORS.textDim, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  rejectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: COLORS.errorGlow, borderRadius: RADIUS.sm, padding: 10,
  },
  rejectionText: { flex: 1, fontSize: 12, color: COLORS.errorLight, lineHeight: 16 },

  uploadDate: { fontSize: 11, color: COLORS.textDim, marginTop: 10 },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.success, borderRadius: RADIUS.md, padding: 12, marginTop: 12,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  approvedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: COLORS.successGlow, borderRadius: RADIUS.sm, padding: 10,
  },
  approvedText: { fontSize: 13, color: COLORS.success, fontWeight: '500' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: {
    backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 24, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, marginTop: 4 },
  modalInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.md, padding: 14, color: '#fff', fontSize: 16, marginBottom: 12,
  },

  imagePicker: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.md, height: 120, marginBottom: 12, overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  imagePlaceholderText: { fontSize: 13, color: COLORS.textMuted },
  imagePreview: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.successGlow,
  },
  imagePreviewText: { fontSize: 13, color: COLORS.success, fontWeight: '600' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
  },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
  modalSubmitBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  modalSubmitBtnDisabled: { opacity: 0.6 },
  modalSubmitGradient: { padding: 14, alignItems: 'center' },
  modalSubmitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
