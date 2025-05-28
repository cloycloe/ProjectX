import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator, 
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { authenticateUser, resetPassword } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [fontsLoaded] = useFonts({
    'THEDISPLAYFONT': require('../assets/fonts/THEDISPLAYFONT-DEMOVERSION.ttf'),
  });

  React.useEffect(() => {
    console.log('Font loading status:', fontsLoaded);
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [userData, setUserData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isNavigating = useRef(false);

  // Forgot password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const showNotification = (title: string, message: string, type: 'success' | 'error', data?: any) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setUserData(data);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (modalType === 'success' && userData) {
      switch (userData.role) {
        case 'admin':
          router.push('/admin-dashboard');
          break;
        case 'lecturer':
          router.push(`/lecturer-dashboard?id=${userData._id}`);
          break;
        case 'student':
          router.push(`/student-dashboard?id=${userData._id}`);
          break;
      }
    }
  };

  const handleLogin = async () => {
    if (isLoading || isNavigating.current) return;
    
    try {
      setIsLoading(true);
      const response = await authenticateUser(username, password);
      
      if (response.success) {
        setUserData(response.user);
        setModalTitle('Success');
        setModalMessage('Login successful!');
        setModalType('success');
        setShowModal(true);
        isNavigating.current = true;
      } else {
        setModalTitle('Error');
        setModalMessage(response.error || 'Invalid credentials');
        setModalType('error');
        setShowModal(true);
      }
    } catch (error) {
      setModalTitle('Error');
      setModalMessage('An error occurred during login');
      setModalType('error');
      setShowModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!email || !username) {
      showNotification('Error', 'Please enter both email and username', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Error', 'Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showNotification('Error', 'Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setIsResettingPassword(true);
      await resetPassword(email, username, newPassword);
      showNotification('Success', 'Password reset successful!', 'success');
      setShowForgotPasswordModal(false);
      setEmail('');
      setUsername('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showNotification('Error', error instanceof Error ? error.message : 'Failed to reset password', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['rgba(26, 75, 142, 0.1)', 'rgba(26, 75, 142, 0.05)', '#fff']}
        style={styles.background}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image 
              source={require('../assets/images/attendanceX1.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoTitle}>ATTENDTRACK</Text>
          </View>
          <Text style={styles.logoSubtitle}>Attendance Management System</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.welcomeSubtext}>Please sign in to continue</Text>

          {modalMessage ? <Text style={styles.errorText}>{modalMessage}</Text> : null}
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>USERNAME</Text>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="person-outline" 
                size={20} 
                color="#1a4b8e" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                autoCapitalize="none"
                placeholderTextColor="#aaa"
                editable={!isLoading}
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#1a4b8e" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                placeholderTextColor="#aaa"
                editable={!isLoading}
              />
              <TouchableOpacity 
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#1a4b8e" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>SIGN IN</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.loginButtonIcon} />
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 AttendTrack. All rights reserved.</Text>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[
              styles.modalIconContainer,
              modalType === 'success' ? styles.successIcon : styles.errorIcon
            ]}>
              <Ionicons
                name={modalType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={40}
                color="#fff"
              />
            </View>
            <Text style={[
              styles.modalTitle,
              modalType === 'success' ? styles.successTitle : styles.errorTitle
            ]}>
              {modalTitle}
            </Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                modalType === 'success' ? styles.successButton : styles.errorButton
              ]}
              onPress={handleModalClose}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalSubtitle}>Enter your email, username, and new password</Text>
            </View>
            
            <View style={styles.modalForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>EMAIL</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#1a4b8e" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#aaa"
                    editable={!isResettingPassword}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>USERNAME</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#1a4b8e" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter your username"
                    autoCapitalize="none"
                    placeholderTextColor="#aaa"
                    editable={!isResettingPassword}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#1a4b8e" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry
                    placeholderTextColor="#aaa"
                    editable={!isResettingPassword}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#1a4b8e" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry
                    placeholderTextColor="#aaa"
                    editable={!isResettingPassword}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowForgotPasswordModal(false);
                  setEmail('');
                  setUsername('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isResettingPassword}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleResetPassword}
                disabled={isResettingPassword}
                activeOpacity={0.8}
              >
                {isResettingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a4b8e',
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 16,
    color: '#666',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#1a4b8e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a4b8e',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a4b8e',
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 75, 142, 0.2)',
    paddingHorizontal: 16,
    height: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#1a4b8e',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  loginButtonIcon: {
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  forgotPasswordText: {
    color: '#1a4b8e',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    backgroundColor: '#1a4b8e',
  },
  errorIcon: {
    backgroundColor: '#dc3545',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  successTitle: {
    color: '#1a4b8e',
  },
  errorTitle: {
    color: '#dc3545',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
  },
  successButton: {
    backgroundColor: '#1a4b8e',
  },
  errorButton: {
    backgroundColor: '#dc3545',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  modalForm: {
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1a4b8e',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 