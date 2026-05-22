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
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.1.8:8000';

export default function JobPreviewScreen({ navigation, route }) {
  const { job, file } = route.params;
  const [loading, setLoading] = useState(false);

  const cost = job.cost_breakdown;
  const queue = job.queue_info;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${API_URL}/jobs/${job.job_id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigation.navigate('Payment', { job_id: job.job_id, job_code: job.job_code, total_amount: cost.total_amount });
    } catch (err) {
      Alert.alert('Error', 'Failed to confirm job. Try again.');
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${API_URL}/jobs/${job.job_id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              navigation.navigate('Dashboard');
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel job.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Preview</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Job Code */}
        <View style={styles.jobCodeBox}>
          <Text style={styles.jobCodeLabel}>Job Code</Text>
          <Text style={styles.jobCode}>{job.job_code}</Text>
        </View>

        {/* File Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>File Details</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>File name</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{file.original_filename}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total pages</Text>
            <Text style={styles.rowValue}>{file.total_pages}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Colour pages</Text>
            <Text style={styles.rowValue}>
              {file.has_colour_pages ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cost Breakdown</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Pages to print</Text>
            <Text style={styles.rowValue}>{cost.pages_to_print}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Copies</Text>
            <Text style={styles.rowValue}>{cost.copies}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Print mode</Text>
            <Text style={styles.rowValue}>{cost.colour_mode === 'bw' ? 'B&W' : 'Colour'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Sides</Text>
            <Text style={styles.rowValue}>{cost.sides === 'single' ? 'Single' : 'Double'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Cost per page</Text>
            <Text style={styles.rowValue}>₹{cost.cost_per_page}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { fontWeight: '500', color: '#1a1a1a' }]}>Total amount</Text>
            <Text style={styles.totalAmount}>₹{cost.total_amount}</Text>
          </View>
        </View>

        {/* Queue Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Queue Status</Text>
          <View style={styles.queueGrid}>
            <View style={styles.queueStat}>
              <Text style={styles.queueStatNum}>{queue.jobs_in_queue}</Text>
              <Text style={styles.queueStatLabel}>Jobs ahead</Text>
            </View>
            <View style={styles.queueStat}>
              <Text style={styles.queueStatNum}>~{queue.estimated_wait_minutes}m</Text>
              <Text style={styles.queueStatLabel}>Wait time</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>🔒 Confirm & Pay ₹{cost.total_amount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel Job</Text>
        </TouchableOpacity>
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
    marginBottom: 16,
    paddingTop: 10,
  },
  backBtn: {
    color: '#639922',
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  jobCodeBox: {
    backgroundColor: '#EAF3DE',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
  },
  jobCodeLabel: {
    fontSize: 11,
    color: '#3B6D11',
    marginBottom: 4,
  },
  jobCode: {
    fontSize: 18,
    fontWeight: '500',
    color: '#27500A',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#639922',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: '#888',
  },
  rowValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: '#e8f0d8',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '500',
    color: '#639922',
  },
  queueGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  queueStat: {
    flex: 1,
    backgroundColor: '#EAF3DE',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  queueStatNum: {
    fontSize: 22,
    fontWeight: '500',
    color: '#27500A',
  },
  queueStatLabel: {
    fontSize: 11,
    color: '#3B6D11',
    marginTop: 2,
  },
  confirmBtn: {
    backgroundColor: '#639922',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  cancelBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  cancelBtnText: {
    color: '#888',
    fontSize: 14,
  },
});
