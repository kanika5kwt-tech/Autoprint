import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.5:8000'; // Change this to your laptop IP

export default function LoginScreen({ navigation }) {
  const [step, setStep] = useState('phone'); // phone | otp | register
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [loading, setLoading] = useState(false);

const handleSendOTP = async () => {
  if (phone.length !== 10) {
    return Alert.alert('Error', 'Enter valid 10-digit phone number');
  }
  setLoading(true);
  try {
    const response = await axios.post(`${API_URL}/auth/send-otp`, { phone_number: phone });
    
    // Show dev OTP if SMS failed (backend sends it back)
    const devOtp = response.data?.dev_otp;
    if (devOtp) {
      Alert.alert('Dev Mode', `SMS failed. Use this OTP: ${devOtp}`);
    } else {
      Alert.alert('Success', 'OTP sent to your phone!');
    }
    
    setStep('otp');
  } catch (err) {
    if (err.response?.status === 404) {
      setStep('register');
    } else {
      Alert.alert('Error', 'Something went wrong. Try again.');
    }
  }
  setLoading(false);
};

  const handleRegister = async () => {
    if (!name || !collegeId) {
      return Alert.alert('Error', 'Please fill all fields');
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register`, {
        full_name: name,
        phone_number: phone,
        college_id: collegeId,
      });
      await axios.post(`${API_URL}/auth/send-otp`, { phone_number: phone });
      Alert.alert('Success', 'Registered! OTP sent');
      setStep('otp');
    } catch (err) {
      Alert.alert('Error', 'Registration failed. Try again.');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      return Alert.alert('Error', 'Enter 6-digit OTP');
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, {
        phone_number: phone,
        otp_code: otp,
      });
      await AsyncStorage.setItem('token', res.data.access_token);
      await AsyncStorage.setItem('user_id', res.data.user_id);
      await AsyncStorage.setItem('full_name', res.data.full_name);
      navigation.replace('Dashboard');
    } catch (err) {
      Alert.alert('Error', 'Invalid OTP. Try again.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Logo */}
          <View style={styles.logoBox}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🖨️</Text>
            </View>
            <Text style={styles.logoTitle}>AutoPrint</Text>
            <Text style={styles.logoSub}>Smart Campus Printing</Text>
          </View>

          {/* Phone Step */}
          {step === 'phone' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSub}>Enter your phone number to continue</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefix}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="9876543210"
                  placeholderTextColor="#aaa"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <TouchableOpacity
                style={styles.btnGreen}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Send OTP →</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('register')}>
                <Text style={styles.linkText}>New here? Register</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Register Step */}
          {step === 'register' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create account</Text>
              <Text style={styles.cardSub}>First time? Fill in your details</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="College ID"
                placeholderTextColor="#aaa"
                value={collegeId}
                onChangeText={setCollegeId}
              />
              <View style={styles.phoneRow}>
                <View style={styles.prefix}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Phone number"
                  placeholderTextColor="#aaa"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <TouchableOpacity
                style={styles.btnGreen}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Register & Send OTP →</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('phone')}>
                <Text style={styles.linkText}>Already registered? Log in</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <View style={styles.card}>
              <View style={styles.otpIconBox}>
                <Text style={{ fontSize: 32 }}>📱</Text>
              </View>
              <Text style={styles.cardTitle}>Enter OTP</Text>
              <Text style={styles.cardSub}>Sent to +91 {phone}</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="6-digit OTP"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
              <TouchableOpacity
                style={styles.btnGreen}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Verify & Login →</Text>
                )}
              </TouchableOpacity>
              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>OTP is valid for 5 minutes</Text>
              </View>
              <TouchableOpacity onPress={() => setStep('phone')}>
                <Text style={styles.linkText}>Change number</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f0',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#639922',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoEmoji: {
    fontSize: 32,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#27500A',
  },
  logoSub: {
    fontSize: 13,
    color: '#3B6D11',
    marginTop: 3,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  phoneRow: {
    flexDirection: 'row',
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
    borderRadius: 10,
    overflow: 'hidden',
  },
  prefix: {
    backgroundColor: '#EAF3DE',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#c0dd97',
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#27500A',
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 0.5,
    borderColor: '#c0dd97',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: 8,
    color: '#27500A',
  },
  btnGreen: {
    backgroundColor: '#639922',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  linkText: {
    textAlign: 'center',
    color: '#639922',
    fontSize: 13,
    marginTop: 4,
  },
  otpIconBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  infoBanner: {
    backgroundColor: '#EAF3DE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  infoText: {
    color: '#27500A',
    fontSize: 12,
    textAlign: 'center',
  },
});





