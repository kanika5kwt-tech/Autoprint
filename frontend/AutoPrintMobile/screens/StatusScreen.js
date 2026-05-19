import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';

export default function StatusScreen({ navigation, route }) {
  const {
    job_id,
    job_code,
    status,
    queue_position,
    estimated_wait,
    qr_code,
    message,
  } = route.params;

  const steps = [
    { label: 'Payment\nDone', done: true },
    { label: 'In\nQueue', done: true },
    { label: 'Printing\nIn Progress', done: false },
    { label: 'Ready to\nCollect', done: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Success Icon */}
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSub}>{message}</Text>
        </View>

        {/* Job Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Print Job Status</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Job code</Text>
            <View style={styles.jobCodePill}>
              <Text style={styles.jobCodeText}>{job_code}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Status</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Queue position</Text>
            <Text style={styles.queueNum}>#{queue_position}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Estimated wait</Text>
            <Text style={styles.rowValue}>~{estimated_wait} minutes</Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Collection QR Code</Text>
          <Text style={styles.qrSub}>Show this QR code at the printer counter</Text>
          {qr_code ? (
            <Image
              source={{ uri: qr_code }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>📱</Text>
            </View>
          )}
          <Text style={styles.qrCode}>{job_code}</Text>
        </View>

        {/* Progress Steps */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Steps</Text>
          <View style={styles.stepsRow}>
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                    {step.done && <Text style={styles.stepDotText}>✓</Text>}
                  </View>
                  <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>
                    {step.label}
                  </Text>
                </View>
                {index < steps.length - 1 && (
                  <View style={[styles.stepLine, step.done && styles.stepLineDone]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Print Another Button */}
        <TouchableOpacity
          style={styles.printAnotherBtn}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.printAnotherText}>+ Print Another Document</Text>
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
  successBox: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  successIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#EAF3DE',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successEmoji: {
    fontSize: 32,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#27500A',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    color: '#3B6D11',
    textAlign: 'center',
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
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: '#e8f0d8',
  },
  jobCodePill: {
    backgroundColor: '#EAF3DE',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#c0dd97',
  },
  jobCodeText: {
    fontSize: 12,
    color: '#27500A',
    fontWeight: '500',
  },
  statusPill: {
    backgroundColor: '#FAEEDA',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#854F0B',
    fontWeight: '500',
  },
  queueNum: {
    fontSize: 22,
    fontWeight: '500',
    color: '#639922',
  },
  qrSub: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    textAlign: 'center',
  },
  qrImage: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginBottom: 8,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: '#f4f6f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  qrPlaceholderText: {
    fontSize: 60,
  },
  qrCode: {
    textAlign: 'center',
    fontSize: 13,
    color: '#639922',
    fontWeight: '500',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1efe8',
    borderWidth: 0.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotDone: {
    backgroundColor: '#639922',
    borderColor: '#639922',
  },
  stepDotText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  stepLabel: {
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
  },
  stepLabelDone: {
    color: '#27500A',
    fontWeight: '500',
  },
  stepLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#ddd',
    marginTop: 12,
  },
  stepLineDone: {
    backgroundColor: '#639922',
  },
  printAnotherBtn: {
    backgroundColor: '#639922',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  printAnotherText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});