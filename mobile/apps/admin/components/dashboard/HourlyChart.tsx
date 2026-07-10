import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Card } from '../common/Card';
import { ADMIN_COLORS } from '../../constants/theme';

interface HourlyData {
  hour: string;
  rides: number;
}

interface HourlyChartProps {
  data: HourlyData[];
}

export default function HourlyChart({ data }: HourlyChartProps) {
  const screenWidth = Dimensions.get('window').width - 64;

  return (
    <Card>
      <Text style={styles.title}>Hourly Activity</Text>
      {data.length > 0 ? (
        <BarChart
          data={{
            labels: data.map(d => d.hour),
            datasets: [{ data: data.map(d => d.rides) }],
          }}
          width={screenWidth}
          height={160}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#16162a',
            backgroundGradientFrom: '#16162a',
            backgroundGradientTo: '#16162a',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: () => 'rgba(255,255,255,0.4)',
            barPercentage: 0.6,
          }}
          style={styles.chart}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  chart: { borderRadius: 12 },
  empty: { height: 160, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
