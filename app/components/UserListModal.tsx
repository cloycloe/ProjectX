import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Keyboard,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, deleteUser } from '../../lib/api';

interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  role: string;
  onRefresh: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.8;
const DRAG_THRESHOLD = 50;

export const UserListModal: React.FC<UserListModalProps> = ({
  visible,
  onClose,
  users,
  onEdit,
  onDelete,
  role,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Animation values
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const filteredUsers = users.filter(user =>
    `${user.idNumber} ${user.firstName} ${user.lastName} ${user.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD) {
          closeDrawer();
        } else {
          // Snap back to open position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const openDrawer = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  useEffect(() => {
    if (visible) {
      openDrawer();
    }
  }, [visible]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(userToDelete._id);
      await deleteUser(userToDelete._id);
      await onDelete(userToDelete._id);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      handleRefresh();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: overlayOpacity }
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={closeDrawer}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [
              {
                translateY: translateY.interpolate({
                  inputRange: [0, SCREEN_HEIGHT],
                  outputRange: [0, SCREEN_HEIGHT],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.drawerContent}>
          {/* Drawer Handle */}
          <View {...panResponder.panHandlers} style={styles.drawerHandle}>
            <View style={styles.handleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{role} Users</Text>
              {isRefreshing ? (
                <ActivityIndicator color="#1a4b8e" />
              ) : (
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                  <Ionicons name="refresh" size={22} color="#1a4b8e" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ID, name, or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* User List */}
          <ScrollView 
            style={styles.userList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredUsers.map((user) => (
              <View key={user._id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userId}>{user.idNumber}</Text>
                  <Text style={styles.userName}>{user.lastName}, {user.firstName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => onEdit(user)}
                  >
                    <Ionicons name="pencil" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteClick(user)}
                    disabled={isDeleting === user._id}
                  >
                    {isDeleting === user._id ? (
                      <ActivityIndicator size="small" color="#F44336" />
                    ) : (
                      <Ionicons name="trash" size={20} color="#F44336" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmContent}>
              <Text style={styles.confirmTitle}>Confirm Delete</Text>
              <Text style={styles.confirmText}>
                Are you sure you want to delete {userToDelete?.firstName} {userToDelete?.lastName}?
              </Text>
              <Text style={styles.confirmWarning}>
                This action cannot be undone.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.cancelConfirmButton]}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={styles.cancelConfirmText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.deleteConfirmButton]}
                  onPress={handleDeleteConfirm}
                  disabled={isDeleting === userToDelete?._id}
                >
                  {isDeleting === userToDelete?._id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.deleteConfirmText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 75, 142, 0.3)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: DRAWER_HEIGHT,
    shadowColor: '#1a4b8e',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  drawerContent: {
    flex: 1,
  },
  drawerHandle: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#1a4b8e',
    opacity: 0.2,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 75, 142, 0.1)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a4b8e',
    marginRight: 12,
  },
  refreshButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f8fc',
    margin: 15,
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(26, 75, 142, 0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1a4b8e',
  },
  userList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(26, 75, 142, 0.1)',
    shadowColor: '#1a4b8e',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userId: {
    fontSize: 14,
    color: '#1a4b8e',
    fontWeight: '600',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a4b8e',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(26, 75, 142, 0.7)',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: 'rgba(26, 75, 142, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 16,
  },
  confirmText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmWarning: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelConfirmButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  deleteConfirmButton: {
    backgroundColor: '#F44336',
  },
  cancelConfirmText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 