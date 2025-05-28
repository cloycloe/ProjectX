import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Animated, Dimensions, FlatList, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { User, Course, getUsers, updateCourse, getCourses } from '../lib/api';

const ITEMS_PER_PAGE = 50;
const WINDOW_HEIGHT = Dimensions.get('window').height;
const { width } = Dimensions.get('window');

// Header Component
const Header = ({ onBack }: { onBack: () => void }) => (
  <View style={styles.headerBackground}>
    <View style={styles.accentBar} />
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.logoTitle, { color: '#fff' }]}>ATTENDTRACK</Text>
          <Text style={[styles.logoSubtitle, { color: '#fff', opacity: 0.9 }]}>Assign Students</Text>
        </View>
      </View>
    </View>
  </View>
);

// Course Card Component
const CourseCard = ({ course, studentCount }: { course: Course; studentCount: number }) => (
  <View style={styles.courseCard}>
    <View style={styles.courseHeader}>
      <Text style={styles.courseCode}>{course.courseCode}</Text>
      <Text style={styles.courseTitle}>{course.courseName}</Text>
      <View style={styles.statItem}>
        <Ionicons name="people" size={20} color="#218c4a" />
        <Text style={styles.statText}>{studentCount} Students</Text>
      </View>
    </View>
  </View>
);

// Search Bar Component
const SearchBar = ({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) => (
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search students by name or ID number..."
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
    />
    {value ? (
      <TouchableOpacity 
        onPress={() => onChangeText('')}
        style={styles.clearButton}
      >
        <Ionicons name="close-circle" size={20} color="#666" />
      </TouchableOpacity>
    ) : null}
  </View>
);

// Student Item Component
const StudentItem = ({ 
  student, 
  isSelected, 
  onToggle 
}: { 
  student: User; 
  isSelected: boolean; 
  onToggle: () => void;
}) => (
  <TouchableOpacity
    style={[styles.studentItem, isSelected && styles.selectedStudent]}
    onPress={onToggle}
  >
    <View style={styles.studentInfo}>
      <View style={styles.studentHeader}>
        <Text style={styles.studentId}>{student.idNumber}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4caf50" />}
      </View>
      <Text style={[styles.studentName, isSelected && styles.selectedStudentText]}>
        {student.lastName}, {student.firstName}
      </Text>
    </View>
    <TouchableOpacity
      style={[styles.actionButton, isSelected ? styles.removeButton : styles.addButton]}
      onPress={onToggle}
    >
      <Ionicons 
        name={isSelected ? 'remove' : 'add'} 
        size={24} 
        color="#fff" 
      />
    </TouchableOpacity>
  </TouchableOpacity>
);

// Success Message Component
const SuccessMessage = ({ message }: { message: string }) => (
  <View style={styles.successContainer}>
    <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
    <Text style={styles.successText}>{message}</Text>
  </View>
);

// Save Button Component
const SaveButton = ({ onPress, isLoading }: { onPress: () => void; isLoading: boolean }) => (
    <TouchableOpacity
    style={[styles.saveButton, isLoading && styles.disabledButton]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
      <ActivityIndicator color="#fff" />
      ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
      )}
    </TouchableOpacity>
);

export default function AssignStudents() {
  const params = useLocalSearchParams();
  const courseId = params.courseId as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const filteredStudents = useMemo(() => {
    return students.filter(student => 
      (student.lastName.toLowerCase() + ', ' + student.firstName.toLowerCase())
        .includes(searchQuery.toLowerCase()) ||
      student.idNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [students, searchQuery]);

  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredStudents, page]);

  useEffect(() => {
    fetchStudents();
    fetchCourse();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchStudents = async () => {
    try {
      const users = await getUsers();
      const studentUsers = users.filter(user => user.role === 'student');
      setStudents(studentUsers);
      setHasMore(studentUsers.length > ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students. Please try again.');
    }
  };

  const fetchCourse = async () => {
    try {
      const courses = await getCourses();
      const course = courses.find((c: Course) => c._id === courseId);
      if (course) {
        setCurrentCourse(course);
        setSelectedStudents(course.students || []);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Failed to fetch course details.');
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      setHasMore(filteredStudents.length > page * ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, filteredStudents.length, page]);

  const handleSaveAssignments = async () => {
    if (!currentCourse) return;

    try {
      setIsLoading(true);
      await updateCourse(currentCourse._id, {
        ...currentCourse,
        students: selectedStudents
      });
      setSuccessMessage('Students assigned successfully!');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error assigning students:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStudent = useCallback((studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  }, []);

  const renderStudentItem = useCallback(({ item: student }: { item: User }) => (
    <StudentItem
      student={student}
      isSelected={selectedStudents.includes(student._id)}
      onToggle={() => handleToggleStudent(student._id)}
    />
  ), [selectedStudents, handleToggleStudent]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="people" size={48} color="#ccc" />
      <Text style={styles.emptyStateText}>
        {searchQuery 
          ? 'No students found matching your search'
          : 'No students available'}
      </Text>
    </View>
  ), [searchQuery]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#1a73e8" />
      </View>
    );
  }, [isLoadingMore]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <Header onBack={() => router.back()} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.accentBar} />
      <View style={styles.contentCentered}>
        {currentCourse && (
          <CourseCard 
            course={currentCourse} 
            studentCount={selectedStudents.length} 
          />
        )}

        {successMessage && <SuccessMessage message={successMessage} />}

        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
        />

        <View style={styles.listContainer}>
          <FlatList
            data={paginatedStudents}
            renderItem={renderStudentItem}
            keyExtractor={item => item._id}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={10}
            contentContainerStyle={styles.studentListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      <SaveButton 
        onPress={handleSaveAssignments} 
        isLoading={isLoading} 
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBackground: {
    backgroundColor: '#1a4b8e',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  accentBar: {
    display: 'none',
  },
  header: {
    backgroundColor: 'transparent',
    padding: 0,
    marginTop: 12,
    marginBottom: 18,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitleContainer: {
    flex: 1,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  courseCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#218c4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
    width: '100%',
  },
  courseHeader: {
    gap: 4,
  },
  courseCode: {
    fontSize: 14,
    color: '#218c4a',
    fontWeight: '600',
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#218c4a',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 140, 74, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statText: {
    marginLeft: 8,
    color: '#218c4a',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#218c4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  studentList: {
    flex: 1,
  },
  studentItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#218c4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedStudent: {
    backgroundColor: 'rgba(33, 140, 74, 0.1)',
    borderWidth: 1,
    borderColor: '#218c4a',
  },
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#218c4a',
  },
  selectedStudentText: {
    color: '#218c4a',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  addButton: {
    backgroundColor: '#218c4a',
  },
  removeButton: {
    backgroundColor: '#dc3545',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  studentListContent: {
    paddingBottom: 20,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  saveButton: {
    backgroundColor: '#1a4b8e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    shadowColor: '#1a4b8e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contentCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
}); 