import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.1.2:8000';

export default function DashboardScreen({ navigation }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    colour_mode: 'bw',
    sides: 'single',
    copies: 1,
    paper_size: 'A4',
    stapling: false,
    page_range_start: 1,
    page_range_end: null,
  });

  const fullName = 'Student';

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
  		'application/pdf',
  		'image/*',
  		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  		'application/msword',
		],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      uploadFile(file);
    } catch (err) {
      Alert.alert('Error', 'Could not pick file');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) return;

      const file = {
        uri: result.assets[0].uri,
        name: `image_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      };
      uploadFile(file);
    } catch (err) {
      Alert.alert('Error', 'Could not pick image');
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      });

      const res = await axios.post(`${API_URL}/jobs/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setUploadedFile({
        ...res.data,
        original_filename: file.name,
      });

      setSettings((prev) => ({
        ...prev,
        page_range_end: res.data.total_pages,
      }));

      Alert.alert(
        'Success',
        `File uploaded! ${res.data.total_pages} page(s) detected`
      );
    } catch (err) {
      Alert.alert('Error', 'Upload failed. Try again.');
    }
    setUploading(false);
  };

  const handleCreateJob = async () => {
    if (!uploadedFile) return Alert.alert('Error', 'Please upload a file first');

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/jobs/create`,
        {
          file_id: uploadedFile.file_id,
          file_name: uploadedFile.original_filename,
          total_pages: uploadedFile.total_pages,
          ...settings,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      navigation.navigate('JobPreview', {
        job: res.data,
        file: uploadedFile,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to create job. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🖨️ AutoPrint</Text>
            <Text style={styles.headerSub}>New Print Job</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Upload Section */}
        <Text style={styles.sectionTitle}>Upload File</Text>

        {uploading ? (
          <View style={styles.uploadBox}>
            <ActivityIndicator color="#639922" size="large" />
            <Text style={styles.uploadingText}>Processing file...</Text>
          </View>
        ) : uploadedFile ? (
          <View style={styles.uploadedBox}>
            <Text style={styles.uploadedIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadedName} numberOfLines={1}>
                {uploadedFile.original_filename}
              </Text>
              <Text style={styles.uploadedInfo}>
                {uploadedFile.total_pages} pages •{' '}
                {uploadedFile.has_colour_pages ? 'Has colour' : 'B&W'}
                {uploadedFile.converted_to_pdf ? ' • Converted from image' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={handlePickDocument}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadOptions}>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handlePickDocument}
            >
              <Text style={styles.uploadBtnIcon}>📄</Text>
              <Text style={styles.uploadBtnText}>Upload File</Text>
	      <Text style={styles.uploadBtnSub}>PDF, Word files</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handlePickImage}
            >
              <Text style={styles.uploadBtnIcon}>🖼️</Text>
              <Text style={styles.uploadBtnText}>Upload Image</Text>
              <Text style={styles.uploadBtnSub}>JPG, PNG, etc</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings */}
        {uploadedFile && (
          <View style={styles.settingsBox}>
            <Text style={styles.sectionTitle}>Print Settings</Text>

            {/* Color Mode */}
            <Text style={styles.settingLabel}>Print Mode</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  settings.colour_mode === 'bw' && styles.toggleActive,
                ]}
                onPress={() =>
                  setSettings((p) => ({ ...p, colour_mode: 'bw' }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    settings.colour_mode === 'bw' && styles.toggleTextActive,
                  ]}
                >
                  B&W
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  settings.colour_mode === 'colour' && styles.toggleActive,
                ]}
                onPress={() =>
                  setSettings((p) => ({ ...p, colour_mode: 'colour' }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    settings.colour_mode === 'colour' && styles.toggleTextActive,
                  ]}
                >
                  Colour
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sides */}
            <Text style={styles.settingLabel}>Sides</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  settings.sides === 'single' && styles.toggleActive,
                ]}
                onPress={() =>
                  setSettings((p) => ({ ...p, sides: 'single' }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    settings.sides === 'single' && styles.toggleTextActive,
                  ]}
                >
                  Single
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  settings.sides === 'double' && styles.toggleActive,
                ]}
                onPress={() =>
                  setSettings((p) => ({ ...p, sides: 'double' }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    settings.sides === 'double' && styles.toggleTextActive,
                  ]}
                >
                  Double
                </Text>
              </TouchableOpacity>
            </View>

            {/* Copies */}
            <Text style={styles.settingLabel}>Copies</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() =>
                  setSettings((p) => ({
                    ...p,
                    copies: Math.max(1, p.copies - 1),
                  }))
                }
              >
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{settings.copies}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() =>
                  setSettings((p) => ({
                    ...p,
                    copies: Math.min(100, p.copies + 1),
                  }))
                }
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Paper Size */}
            <Text style={styles.settingLabel}>Paper Size</Text>
            <View style={styles.toggleGroup}>
              {['A4', 'A3', 'Letter'].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.toggleBtn,
                    settings.paper_size === size && styles.toggleActive,
                  ]}
                  onPress={() =>
                    setSettings((p) => ({ ...p, paper_size: size }))
                  }
                >
                  <Text
                    style={[
                      styles.toggleText,
                      settings.paper_size === size && styles.toggleTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stapling */}
            <Text style={styles.settingLabel}>Stapling</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  !settings.stapling && styles.toggleActive,
                ]}
                onPress={() => setSettings((p) => ({ ...p, stapling: false }))}
              >
                <Text
                  style={[
                    styles.toggleText,
                    !settings.stapling && styles.toggleTextActive,
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  settings.stapling && styles.toggleActive,
                ]}
                onPress={() => setSettings((p) => ({ ...p, stapling: true }))}
              >
                <Text
                  style={[
                    styles.toggleText,
                    settings.stapling && styles.toggleTextActive,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Proceed Button */}
        {uploadedFile && (
          <TouchableOpacity style={styles.proceedBtn} onPress={handleCreateJob}>
            <Text style={styles.proceedBtnText}>Calculate Cost & Preview →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f0',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#27500A',
  },
  headerSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#c0dd97',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#639922',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  uploadBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#c0dd97',
    marginBottom: 16,
  },
  uploadingText: {
    color: '#639922',
    marginTop: 10,
    fontSize: 13,
  },
  uploadedBox: {
    backgroundColor: '#EAF3DE',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
    marginBottom: 16,
  },
  uploadedIcon: {
    fontSize: 24,
  },
  uploadedName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#27500A',
  },
  uploadedInfo: {
    fontSize: 11,
    color: '#3B6D11',
    marginTop: 2,
  },
  changeBtn: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: '#639922',
  },
  changeBtnText: {
    color: '#639922',
    fontSize: 12,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c0dd97',
    borderStyle: 'dashed',
  },
  uploadBtnIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#27500A',
  },
  uploadBtnSub: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  settingsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    marginTop: 10,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f4f6f0',
    borderWidth: 0.5,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#EAF3DE',
    borderColor: '#639922',
  },
  toggleText: {
    fontSize: 13,
    color: '#888',
  },
  toggleTextActive: {
    color: '#27500A',
    fontWeight: '500',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EAF3DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    color: '#639922',
    fontWeight: '500',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#27500A',
    minWidth: 30,
    textAlign: 'center',
  },
  proceedBtn: {
    backgroundColor: '#639922',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  proceedBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
