/**
 * LoginScreen - User Authentication
 * Original implementation for WordMaster
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Custom hook for form state management
const useLoginForm = () => {
  const [credentials, setCredentials] = React.useState({ email: '', password: '' });
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const updateField = useCallback((field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    
    if (!credentials.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!credentials.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [credentials]);

  return {
    credentials,
    updateField,
    isProcessing,
    setIsProcessing,
    errors,
    validate
  };
};

const LoginScreen = ({ navigation }) => {
  const authContext = useAuth();
  const formState = useLoginForm();

  const performLogin = useCallback(async () => {
    if (!formState.validate()) {
      return;
    }

    formState.setIsProcessing(true);
    
    try {
      const result = await authContext.login(
        formState.credentials.email.trim().toLowerCase(),
        formState.credentials.password
      );

      if (result.error) {
        Alert.alert('Authentication Error', result.error);
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      formState.setIsProcessing(false);
    }
  }, [authContext, formState]);

  const navigateToPasswordRecovery = useCallback(() => {
    Alert.alert(
      'Password Recovery',
      'This feature will be available soon. Please contact support if you need immediate assistance.',
      [{ text: 'Understood', style: 'cancel' }]
    );
  }, []);

  const navigateToSignup = useCallback(() => {
    navigation.navigate('Signup');
  }, [navigation]);

  const goToPreviousScreen = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const isSubmitDisabled = useMemo(() => {
    return formState.isProcessing || !formState.credentials.email || !formState.credentials.password;
  }, [formState.isProcessing, formState.credentials]);

  return (
    <ScrollView 
      style={screenStyles.scrollContainer}
      contentContainerStyle={screenStyles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={screenStyles.mainWrapper}>
        
        {/* Header Section */}
        <View style={screenStyles.headerSection}>
          <Text style={screenStyles.welcomeTitle}>Welcome Back!</Text>
          <Text style={screenStyles.instructionText}>
            Sign in to sync your progress across devices
          </Text>
        </View>

        {/* Email Input */}
        <View style={screenStyles.fieldWrapper}>
          <Text style={screenStyles.fieldLabel}>Email Address</Text>
          <TextInput
            style={[
              screenStyles.textField,
              formState.errors.email && screenStyles.textFieldError
            ]}
            value={formState.credentials.email}
            onChangeText={(val) => formState.updateField('email', val)}
            placeholder="user@example.com"
            placeholderTextColor="#A0A0A0"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!formState.isProcessing}
          />
          {formState.errors.email && (
            <Text style={screenStyles.errorMessage}>{formState.errors.email}</Text>
          )}
        </View>

        {/* Password Input */}
        <View style={screenStyles.fieldWrapper}>
          <Text style={screenStyles.fieldLabel}>Password</Text>
          <TextInput
            style={[
              screenStyles.textField,
              formState.errors.password && screenStyles.textFieldError
            ]}
            value={formState.credentials.password}
            onChangeText={(val) => formState.updateField('password', val)}
            placeholder="Your password"
            placeholderTextColor="#A0A0A0"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={performLogin}
            editable={!formState.isProcessing}
          />
          {formState.errors.password && (
            <Text style={screenStyles.errorMessage}>{formState.errors.password}</Text>
          )}
        </View>

        {/* Recovery Link */}
        <TouchableOpacity 
          style={screenStyles.recoveryLink}
          onPress={navigateToPasswordRecovery}
          disabled={formState.isProcessing}
        >
          <Text style={screenStyles.recoveryLinkText}>
            Forgot your password?
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            screenStyles.submitButton,
            isSubmitDisabled && screenStyles.submitButtonDisabled
          ]}
          onPress={performLogin}
          disabled={isSubmitDisabled}
          activeOpacity={0.8}
        >
          {formState.isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={screenStyles.submitButtonLabel}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Signup Prompt */}
        <View style={screenStyles.signupPrompt}>
          <Text style={screenStyles.promptText}>New to WordMaster? </Text>
          <TouchableOpacity 
            onPress={navigateToSignup}
            disabled={formState.isProcessing}
          >
            <Text style={screenStyles.signupLinkText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Back Navigation */}
        <TouchableOpacity
          style={screenStyles.backNav}
          onPress={goToPreviousScreen}
          disabled={formState.isProcessing}
        >
          <Text style={screenStyles.backNavText}>← Return</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
};

const screenStyles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  mainWrapper: {
    flex: 1,
    paddingHorizontal: Math.min(width * 0.08, 35),
    paddingTop: 70,
  },
  headerSection: {
    marginBottom: 45,
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  instructionText: {
    fontSize: 17,
    color: '#6B6B6B',
    lineHeight: 24,
  },
  fieldWrapper: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  textField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontSize: 17,
    color: '#1A1A1A',
  },
  textFieldError: {
    borderColor: '#E74C3C',
  },
  errorMessage: {
    fontSize: 13,
    color: '#E74C3C',
    marginTop: 6,
    marginLeft: 4,
  },
  recoveryLink: {
    alignSelf: 'flex-end',
    marginBottom: 30,
    paddingVertical: 6,
  },
  recoveryLinkText: {
    fontSize: 15,
    color: '#3498DB',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#95A5A6',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  promptText: {
    fontSize: 16,
    color: '#6B6B6B',
  },
  signupLinkText: {
    fontSize: 16,
    color: '#3498DB',
    fontWeight: '700',
  },
  backNav: {
    marginTop: 30,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backNavText: {
    fontSize: 16,
    color: '#95A5A6',
    fontWeight: '500',
  },
});

export default LoginScreen;
