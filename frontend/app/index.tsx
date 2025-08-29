import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

// Theme colors - support for dark mode
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
  inputBorder: isDark ? '#505050' : '#D1D5DB',
  shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
});

export default function TaskListScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [quickAddText, setQuickAddText] = useState('');

  const colors = getColors(isDarkMode);

  // Load theme preference
  useEffect(() => {
    loadThemePreference();
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

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.log('Failed to save theme preference');
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tasks`);
      if (response.ok) {
        const tasksData = await response.json();
        setTasks(tasksData);
      } else {
        Alert.alert('Error', 'Failed to fetch tasks');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
      console.error('Fetch tasks error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Filter and search tasks
  useEffect(() => {
    let filtered = [...tasks];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(task => task.category === selectedCategory);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(task => task.status === selectedStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'due_date':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, selectedCategory, selectedPriority, selectedStatus, sortBy]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [fetchTasks]);

  const quickAddTask = async () => {
    if (!quickAddText.trim()) return;

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: quickAddText.trim(),
          priority: 'medium',
          category: 'personal',
        }),
      });

      if (response.ok) {
        setQuickAddText('');
        fetchTasks();
      } else {
        Alert.alert('Error', 'Failed to create task');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === task.id ? { ...t, status: newStatus } : t
          )
        );
      } else {
        Alert.alert('Error', 'Failed to update task status');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
      console.error('Toggle status error:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tasks/${taskId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
              } else {
                Alert.alert('Error', 'Failed to delete task');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error occurred');
              console.error('Delete task error:', error);
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getDueDateInfo = (due_date: string | undefined) => {
    if (!due_date) return null;
    
    const dueDate = new Date(due_date);
    const now = new Date();
    
    if (isToday(dueDate)) {
      return { text: 'Today', color: colors.warning, urgent: true };
    } else if (isTomorrow(dueDate)) {
      return { text: 'Tomorrow', color: colors.accent, urgent: false };
    } else if (isPast(dueDate)) {
      const days = Math.abs(differenceInDays(dueDate, now));
      return { text: `${days}d overdue`, color: colors.error, urgent: true };
    } else {
      const days = differenceInDays(dueDate, now);
      return { text: `${days}d left`, color: colors.textSecondary, urgent: false };
    }
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    const overdue = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status === 'pending').length;
    
    return { total, completed, pending, overdue };
  };

  const stats = getTaskStats();

  const renderTask = ({ item: task }: { item: Task }) => {
    const dueDateInfo = getDueDateInfo(task.due_date);
    
    return (
      <View style={[styles.taskCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.taskHeader}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: task.status === 'completed' ? colors.success : colors.border },
              task.status === 'completed' && { backgroundColor: colors.success }
            ]}
            onPress={() => toggleTaskStatus(task)}
          >
            {task.status === 'completed' && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          
          <View style={styles.taskContent}>
            <Text style={[
              styles.taskTitle,
              { color: colors.text },
              task.status === 'completed' && { color: colors.textSecondary, textDecorationLine: 'line-through' }
            ]}>
              {task.title}
            </Text>
            
            {task.description && (
              <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                {task.description}
              </Text>
            )}
            
            <View style={styles.taskMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                <Text style={styles.priorityText}>{task.priority}</Text>
              </View>
              
              <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{task.category}</Text>
              
              {dueDateInfo && (
                <View style={[styles.dueBadge, { backgroundColor: dueDateInfo.color + '20' }]}>
                  <Ionicons 
                    name={dueDateInfo.urgent ? "alert-circle" : "calendar"} 
                    size={12} 
                    color={dueDateInfo.color} 
                  />
                  <Text style={[styles.dueText, { color: dueDateInfo.color }]}>
                    {dueDateInfo.text}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.taskActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/edit-task?id=${task.id}`)}
            >
              <Ionicons name="pencil" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => deleteTask(task.id)}
            >
              <Ionicons name="trash" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderStats = () => (
    <View style={[styles.statsContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.accent }]}>{stats.total}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.success }]}>{stats.completed}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.pending}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
      </View>
      {stats.overdue > 0 && (
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.error }]}>{stats.overdue}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="list-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks yet</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Add your first task to get started
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.accent }]}
        onPress={() => router.push('/add-task')}
      >
        <Text style={styles.addButtonText}>Add Task</Text>
      </TouchableOpacity>
    </View>
  );

  const FilterModal = () => (
    <Modal visible={showFilters} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.filterModal, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {/* Filter Options */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.filterButtons}>
              {['all', 'work', 'personal', 'study', 'other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterButton,
                    { borderColor: colors.border },
                    selectedCategory === cat && { backgroundColor: colors.accent }
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: selectedCategory === cat ? '#FFFFFF' : colors.text }
                  ]}>
                    {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Priority</Text>
            <View style={styles.filterButtons}>
              {['all', 'high', 'medium', 'low'].map((pri) => (
                <TouchableOpacity
                  key={pri}
                  style={[
                    styles.filterButton,
                    { borderColor: colors.border },
                    selectedPriority === pri && { backgroundColor: colors.accent }
                  ]}
                  onPress={() => setSelectedPriority(pri)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: selectedPriority === pri ? '#FFFFFF' : colors.text }
                  ]}>
                    {pri === 'all' ? 'All' : pri.charAt(0).toUpperCase() + pri.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Status</Text>
            <View style={styles.filterButtons}>
              {['all', 'pending', 'completed'].map((stat) => (
                <TouchableOpacity
                  key={stat}
                  style={[
                    styles.filterButton,
                    { borderColor: colors.border },
                    selectedStatus === stat && { backgroundColor: colors.accent }
                  ]}
                  onPress={() => setSelectedStatus(stat)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: selectedStatus === stat ? '#FFFFFF' : colors.text }
                  ]}>
                    {stat === 'all' ? 'All' : stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Sort By</Text>
            <View style={styles.filterButtons}>
              {[
                { key: 'created_at', label: 'Recent' },
                { key: 'title', label: 'Name' },
                { key: 'due_date', label: 'Due Date' },
                { key: 'priority', label: 'Priority' }
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.filterButton,
                    { borderColor: colors.border },
                    sortBy === sort.key && { backgroundColor: colors.accent }
                  ]}
                  onPress={() => setSortBy(sort.key)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: sortBy === sort.key ? '#FFFFFF' : colors.text }
                  ]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>TaskMaster</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleTheme}
          >
            <Ionicons name={isDarkMode ? "sunny" : "moon"} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/analytics')}
          >
            <Ionicons name="analytics" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/add-task')}
          >
            <Ionicons name="add" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search tasks..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Quick Add */}
      <View style={[styles.quickAddContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.quickAddBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <TextInput
            style={[styles.quickAddInput, { color: colors.text }]}
            placeholder="Quick add task..."
            placeholderTextColor={colors.textSecondary}
            value={quickAddText}
            onChangeText={setQuickAddText}
            onSubmitEditing={quickAddTask}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={quickAddTask}>
            <Ionicons name="add-circle" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      {tasks.length > 0 && renderStats()}

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredTasks.length === 0 && styles.listContainerEmpty
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={searchQuery ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : renderEmptyState}
      />

      <FilterModal />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  quickAddContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quickAddBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  listContainerEmpty: {
    flex: 1,
  },
  taskCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  categoryText: {
    fontSize: 12,
    textTransform: 'capitalize',
    marginRight: 8,
    marginBottom: 4,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  taskActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});