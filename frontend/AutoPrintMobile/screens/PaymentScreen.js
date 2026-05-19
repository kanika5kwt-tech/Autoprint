import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.1.2:8000';

export default function PaymentScreen({ navigation, route }) {
  const { job_id, job_code, total_amount } = route.params;
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('upi');

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/payments/create-order/${job_id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(res.data.payment_order);
    } catch (err) {
      Alert.alert('Error', 'Failed to create payment order.');
    }
    setLoading(false);
  };

  const verifyAndNavigate = async (orderId, paymentId, signature) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/payments/verify`,
        {
          job_id: job_id,
          order_id: orderId,
          payment_id: paymentId,
          signature: signature,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigation.replace('Status', { ...res.data });
    } catch (err) {
      Alert.alert('Error', 'Payment verification failed. Contact support.');
    }
  };

  const handleUPIPay = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const upiUrl = `upi://pay?pa=razorpay@upi&pn=AutoPrint&am=${total_amount}&cu=INR&tn=${job_code}`;
      const canOpen = await Linking.canOpenURL(upiUrl);

      if (canOpen) {
        await Linking.openURL(upiUrl);
        setTimeout(() => {
          Alert.alert(
            'Payment Complete?',
            'Did you complete the payment in your UPI app?',
            [
              {
                text: 'Yes, I paid',
                onPress: async () => {
                  const mockOrderId = order.order_id.includes('mock')
                    ? order.order_id
                    : `order_mock_${Date.now()}`;
                  await verifyAndNavigate(mockOrderId, 'pay_mock_upi123', 'mock_sig');
                },
              },
              { text: 'No, Cancel', style: 'cancel' },
            ]
          );
        }, 2000);
      } else {
        Alert.alert(
          'No UPI App Found',
          'Please install GPay, PhonePe, or Paytm to pay via UPI, or choose another payment method.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'UPI payment failed. Try another method.');
    }
    setLoading(false);
  };

  const handleCardPay = async () => {
    if (!order) return;
    setLoading(true);
    try {
      Alert.alert(
        'Card Payment',
        'You will be redirected to Razorpay secure payment page.',
        [
          {
            text: 'Continue',
            onPress: async () => {
              await Linking.openURL(
                `https://api.razorpay.com/v1/checkout/embedded?key_id=rzp_test_Sjcp3rNHCux5FR&order_id=${order.order_id}&amount=${order.amount_paise}&currency=INR&name=AutoPrint&description=${job_code}`
              );
              setTimeout(() => {
                Alert.alert(
                  'Payment Complete?',
                  'Did you complete the card payment?',
                  [
                    {
                      text: 'Yes',
                      onPress: async () => {
                        const mockOrderId = order.order_id.includes('mock')
                          ? order.order_id
                          : `order_mock_${Date.now()}`;
                        await verifyAndNavigate(mockOrderId, 'pay_mock_card123', 'mock_sig');
                      },
                    },
                    { text: 'No', style: 'cancel' },
                  ]
                );
              }, 3000);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Card payment failed.');
    }
    setLoading(false);
  };

  const handleNetBankingPay = async () => {
    if (!order) return;
    setLoading(true);
    try {
      Alert.alert(
        'Net Banking',
        "You will be redirected to your bank's payment page.",
        [
          {
            text: 'Continue',
            onPress: async () => {
              await Linking.openURL(
                `https://api.razorpay.com/v1/checkout/embedded?key_id=rzp_test_Sjcp3rNHCux5FR&order_id=${order.order_id}&amount=${order.amount_paise}&currency=INR&name=AutoPrint&description=${job_code}&method=netbanking`
              );
              setTimeout(() => {
                Alert.alert(
                  'Payment Complete?',
                  'Did you complete the net banking payment?',
                  [
                    {
                      text: 'Yes',
                      onPress: async () => {
                        const mockOrderId = order.order_id.includes('mock')
                          ? order.order_id
                          : `order_mock_${Date.now()}`;
                        await verifyAndNavigate(mockOrderId, 'pay_mock_nb123', 'mock_sig');
                      },
                    },
                    { text: 'No', style: 'cancel' },
                  ]
                );
              }, 3000);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Net banking payment failed.');
    }
    setLoading(false);
  };

  const handlePay = () => {
    if (selectedMethod === 'upi') handleUPIPay();
    else if (selectedMethod === 'card') handleCardPay();
    else if (selectedMethod === 'netbanking') handleNetBankingPay();
  };

  const paymentMethods = [
    { id: 'upi', icon: '📱', title: 'UPI / QR Code', sub: 'GPay, PhonePe, Paytm' },
    { id: 'card', icon: '💳', title: 'Debit / Credit Card', sub: 'Visa, Mastercard, Rupay' },
    { id: 'netbanking', icon: '🏦', title: 'Net Banking', sub: 'All major banks' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Amount */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>₹{total_amount}</Text>
          <View style={styles.jobCodePill}>
            <Text style={styles.jobCodeText}>{job_code}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.payOption,
                selectedMethod === method.id && styles.payOptionSelected,
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <Text style={styles.payOptionIcon}>{method.icon}</Text>
              <View style={styles.payOptionInfo}>
                <Text style={[
                  styles.payOptionTitle,
                  selectedMethod === method.id && styles.payOptionTitleSelected,
                ]}>
                  {method.title}
                </Text>
                <Text style={styles.payOptionSub}>{method.sub}</Text>
              </View>
              {selectedMethod === method.id && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Job code</Text>
            <Text style={styles.rowValue}>{job_code}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { fontWeight: '500', color: '#1a1a1a' }]}>Total</Text>
            <Text style={styles.totalText}>₹{total_amount}</Text>
          </View>
        </View>

        {/* Security */}
        <View style={styles.secureRow}>
          <Text style={styles.secureText}>🔒 100% Secure Payment via Razorpay</Text>
        </View>

        {/* Pay Button */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#639922" size="large" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.payBtn}
            onPress={handlePay}
            disabled={!order}
          >
            <Text style={styles.payBtnText}>
              {'🔒 Pay ₹' + total_amount + ' via ' + (
                selectedMethod === 'upi' ? 'UPI' :
                selectedMethod === 'card' ? 'Card' : 'Net Banking'
              )}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerText}>Powered by Razorpay · 256-bit SSL</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f0' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 10,
  },
  backBtn: { color: '#639922', fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  amountBox: {
    backgroundColor: '#EAF3DE',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
  },
  amountLabel: { fontSize: 12, color: '#3B6D11', marginBottom: 6 },
  amountValue: { fontSize: 36, fontWeight: '500', color: '#27500A', marginBottom: 8 },
  jobCodePill: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
  },
  jobCodeText: { fontSize: 12, color: '#639922', fontWeight: '500' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
  },
  cardTitle: { fontSize: 13, fontWeight: '500', color: '#639922', marginBottom: 10 },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 9,
    marginBottom: 8,
    backgroundColor: '#f7f8f5',
    borderWidth: 0.5,
    borderColor: '#e8e8e8',
    gap: 10,
  },
  payOptionSelected: {
    backgroundColor: '#EAF3DE',
    borderColor: '#639922',
  },
  payOptionIcon: { fontSize: 22 },
  payOptionInfo: { flex: 1 },
  payOptionTitle: { fontSize: 13, fontWeight: '500', color: '#888' },
  payOptionTitleSelected: { color: '#27500A' },
  payOptionSub: { fontSize: 11, color: '#aaa', marginTop: 1 },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#639922',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 13, color: '#888' },
  rowValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  divider: { borderTopWidth: 0.5, borderTopColor: '#e8f0d8' },
  totalText: { fontSize: 18, fontWeight: '500', color: '#639922' },
  secureRow: { alignItems: 'center', marginBottom: 14 },
  secureText: { fontSize: 12, color: '#888' },
  loadingBox: { alignItems: 'center', padding: 20 },
  loadingText: { color: '#639922', marginTop: 10, fontSize: 13 },
  payBtn: {
    backgroundColor: '#639922',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  footerText: { textAlign: 'center', fontSize: 11, color: '#aaa' },
});
