import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Theme colors with dark mode support
const getColors = (isDark: boolean) => ({
  background: isDark ? '#1A1A1A' : '#FAFAFA',
  cardBackground: isDark ? '#2D2D2D' : '#FFFFFF',
  text: isDark ? '#FFFFFF' : '#2D2D2D',
  textSecondary: isDark ? '#B0B0B0' : '#757575',
  accent: '#6B73FF',
  success: '#10B981',
  warning: '#F59E0B',
  border: isDark ? '#404040' : '#E5E7EB',
  inputBorder: isDark ? '#505050' : '#D1D5DB',
  shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
});

export default function AddTaskScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState<'work' | 'personal' | 'study' | 'other'>('personal');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);

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

  const createTask = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a task title');
      return;
    }

    setLoading(true);
    
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        ...(dueDate && { due_date: dueDate.toISOString() }),
      };

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        // TODO: Schedule local notification if hasReminder is true
        if (hasReminder && dueDate) {
          // This would integrate with Expo Notifications
          console.log('Would schedule reminder for:', dueDate);
        }
        router.back();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to create task');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
      console.error('Create task error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} backgroundColor={colors.background} />
      
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Task</Text>
        
        <TouchableOpacity
          style={[styles.headerButton, { opacity: loading ? 0.5 : 1 }]}
          onPress={createTask}
          disabled={loading}
        >
          <Ionicons name="checkmark" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter task title"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="next"
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.cardBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add task description (optional)"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Due Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Due Date</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.cardBackground, borderColor: colors.inputBorder }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: dueDate ? colors.text : colors.textSecondary }]}>
                  {dueDate ? formatDate(dueDate) : 'Set due date (optional)'}
                </Text>
                {dueDate && (
                  <TouchableOpacity onPress={() => setDueDate(null)}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Reminder Toggle */}
            {dueDate && (
              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <View>
                    <Text style={[styles.label, { color: colors.text }]}>Set Reminder</Text>
                    <Text style={[styles.switchSubtitle, { color: colors.textSecondary }]}>
                      Get notified about this task
                    </Text>
                  </View>
                  <Switch
                    value={hasReminder}
                    onValueChange={setHasReminder}
                    trackColor={{ false: colors.border, true: colors.accent + '40' }}
                    thumbColor={hasReminder ? colors.accent : colors.textSecondary}
                  />
                </View>
              </View>
            )}

            {/* Priority Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
              <View style={styles.priorityContainer}>
                {['low', 'medium', 'high'].map((pri) => (
                  <TouchableOpacity
                    key={pri}
                    style={[
                      styles.priorityButton,
                      { borderColor: colors.border },
                      priority === pri && { backgroundColor: colors.accent }
                    ]}
                    onPress={() => setPriority(pri as any)}
                  >
                    <Ionicons 
                      name={
                        pri === 'high' ? 'alert-circle' : 
                        pri === 'medium' ? 'ellipse' : 'checkmark-circle'
                      } 
                      size={16} 
                      color={priority === pri ? '#FFFFFF' : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.priorityButtonText,
                      { color: priority === pri ? '#FFFFFF' : colors.text }
                    ]}>
                      {pri.charAt(0).toUpperCase() + pri.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Category</Text>
              <View style={styles.categoryContainer}>
                {[
                  { key: 'personal', icon: 'person', label: 'Personal' },
                  { key: 'work', icon: 'briefcase', label: 'Work' },
                  { key: 'study', icon: 'school', label: 'Study' },
                  { key: 'other', icon: 'ellipsis-horizontal', label: 'Other' }
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryButton,
                      { borderColor: colors.border },
                      category === cat.key && { backgroundColor: colors.accent }
                    ]}
                    onPress={() => setCategory(cat.key as any)}
                  >
                    <Ionicons 
                      name={cat.icon as any} 
                      size={16} 
                      color={category === cat.key ? '#FFFFFF' : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.categoryButtonText,
                      { color: category === cat.key ? '#FFFFFF' : colors.text }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: colors.accent, opacity: loading ? 0.5 : 1 }]}
                onPress={createTask}
                disabled={loading}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Creating...' : 'Create Task'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => router.back()}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}
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
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  priorityButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: '47%',
  },
  categoryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#6B73FF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});