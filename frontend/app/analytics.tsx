import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  startOfWeek, 
  endOfWeek, 
  format, 
  subWeeks, 
  isThisWeek, 
  parseISO,
  differenceInDays,
  startOfDay,
  endOfDay 
} from 'date-fns';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

// Types
interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  category: 'work' | 'personal' | 'study' | 'other';
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

interface Analytics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  todaysTasks: number;
  thisWeekTasks: number;
  categoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  weeklyProgress: Array<{ day: string; completed: number; created: number }>;
}

// Theme colors with dark mode support
const getColors = (isDark: boolean) => ({
  background: isDark ? '#1A1A1A' : '#FAFAFA',
  cardBackground: isDark ? '#2D2D2D' : '#FFFFFF',
  text: isDark ? '#FFFFFF' : '#2D2D2D',
  textSecondary: isDark ? '#B0B0B0' : '#757575',
  accent: '#6B73FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: isDark ? '#404040' : '#E5E7EB',
});

export default function AnalyticsScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const colors = getColors(isDarkMode);

  useEffect(() => {
    loadThemePreference();
    fetchTasksAndAnalyze();
  }, []);

  const loadThemePreference = async () => {
    try {
      const theme = await AsyncStorage.getItem('theme');
      if (theme === 'dark') {
        setIsDarkMode(true);
      }
    } catch (error) {
      console.log('Failed to load theme preference');
    }
  };

  const fetchTasksAndAnalyze = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tasks`);
      if (response.ok) {
        const tasksData = await response.json();
        setTasks(tasksData);
        analyzeData(tasksData);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeData = (tasks: Task[]) => {
    const now = new Date();
    const startOfWeekDate = startOfWeek(now);
    const endOfWeekDate = endOfWeek(now);

    // Basic stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Overdue tasks
    const overdueTasks = tasks.filter(t => 
      t.due_date && 
      t.status === 'pending' && 
      new Date(t.due_date) < startOfDay(now)
    ).length;

    // Today's tasks
    const todaysTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const taskDate = new Date(t.due_date);
      return (
        taskDate >= startOfDay(now) && 
        taskDate <= endOfDay(now)
      );
    }).length;

    // This week's tasks
    const thisWeekTasks = tasks.filter(t => {
      if (!t.created_at) return false;
      return isThisWeek(parseISO(t.created_at));
    }).length;

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    tasks.forEach(task => {
      categoryBreakdown[task.category] = (categoryBreakdown[task.category] || 0) + 1;
    });

    // Priority breakdown
    const priorityBreakdown: Record<string, number> = {};
    tasks.forEach(task => {
      priorityBreakdown[task.priority] = (priorityBreakdown[task.priority] || 0) + 1;
    });

    // Weekly progress (last 7 days)
    const weeklyProgress = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const created = tasks.filter(t => {
        const createdDate = parseISO(t.created_at);
        return createdDate >= dayStart && createdDate <= dayEnd;
      }).length;
      
      const completed = tasks.filter(t => {
        const updatedDate = parseISO(t.updated_at);
        return (
          t.status === 'completed' &&
          updatedDate >= dayStart && 
          updatedDate <= dayEnd
        );
      }).length;

      weeklyProgress.push({
        day: format(day, 'EEE'),
        created,
        completed
      });
    }

    setAnalytics({
      totalTasks,
      completedTasks,
      completionRate,
      overdueTasks,
      todaysTasks,
      thisWeekTasks,
      categoryBreakdown,
      priorityBreakdown,
      weeklyProgress
    });
  };

  const renderStatCard = (title: string, value: string | number, color: string, icon: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  const renderProgressBar = (percentage: number) => (
    <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
      <View 
        style={[
          styles.progressBar, 
          { 
            width: `${percentage}%`,
            backgroundColor: colors.success 
          }
        ]} 
      />
    </View>
  );

  const renderWeeklyChart = () => {
    if (!analytics) return null;

    const maxValue = Math.max(
      ...analytics.weeklyProgress.map(d => Math.max(d.created, d.completed)),
      1
    );

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Weekly Activity</Text>
        <View style={styles.chart}>
          {analytics.weeklyProgress.map((day, index) => (
            <View key={index} style={styles.chartDay}>
              <View style={styles.chartBars}>
                <View 
                  style={[
                    styles.chartBar,
                    { 
                      height: (day.created / maxValue) * 60,
                      backgroundColor: colors.accent + '60'
                    }
                  ]} 
                />
                <View 
                  style={[
                    styles.chartBar,
                    { 
                      height: (day.completed / maxValue) * 60,
                      backgroundColor: colors.success
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.chartDayLabel, { color: colors.textSecondary }]}>
                {day.day}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.accent + '60' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Created</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Completed</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryChart = () => {
    if (!analytics) return null;

    const total = Object.values(analytics.categoryBreakdown).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Tasks by Category</Text>
        {Object.entries(analytics.categoryBreakdown).map(([category, count]) => {
          const percentage = (count / total) * 100;
          return (
            <View key={category} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                  {count} ({percentage.toFixed(0)}%)
                </Text>
              </View>
              {renderProgressBar(percentage)}
            </View>
          );
        })}
      </View>
    );
  };

  if (loading || !analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          {renderStatCard('Total Tasks', analytics.totalTasks, colors.accent, 'list')}
          {renderStatCard('Completed', analytics.completedTasks, colors.success, 'checkmark-circle')}
          {renderStatCard('Completion Rate', `${analytics.completionRate.toFixed(0)}%`, colors.success, 'stats-chart')}
          {renderStatCard('Overdue', analytics.overdueTasks, colors.error, 'alert-circle')}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          {renderStatCard("Today's Tasks", analytics.todaysTasks, colors.warning, 'calendar')}
          {renderStatCard('This Week', analytics.thisWeekTasks, colors.accent, 'time')}
        </View>

        {/* Weekly Progress Chart */}
        {renderWeeklyChart()}

        {/* Category Breakdown */}
        {renderCategoryChart()}

        {/* Insights */}
        <View style={[styles.insightsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Insights</Text>
          
          <View style={styles.insight}>
            <Ionicons name="trending-up" size={16} color={colors.success} />
            <Text style={[styles.insightText, { color: colors.text }]}>
              You've completed {analytics.completedTasks} tasks so far
            </Text>
          </View>
          
          {analytics.overdueTasks > 0 && (
            <View style={styles.insight}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                You have {analytics.overdueTasks} overdue task{analytics.overdueTasks > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          
          {analytics.completionRate >= 80 && (
            <View style={styles.insight}>
              <Ionicons name="trophy" size={16} color={colors.warning} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                Great job! You're maintaining a high completion rate
              </Text>
            </View>
          )}
          
          {analytics.todaysTasks > 0 && (
            <View style={styles.insight}>
              <Ionicons name="calendar" size={16} color={colors.accent} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                You have {analytics.todaysTasks} task{analytics.todaysTasks > 1 ? 's' : ''} due today
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 14,
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
    marginBottom: 16,
  },
  chartDay: {
    alignItems: 'center',
    flex: 1,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 2,
  },
  chartBar: {
    width: 8,
    minHeight: 2,
    borderRadius: 2,
  },
  chartDayLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 12,
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  insightsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    flex: 1,
  },
});