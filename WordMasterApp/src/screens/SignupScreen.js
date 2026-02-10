/**
 * SignupScreen - New User Registration
 * Original WordMaster implementation
 */

import React from 'react';
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

// Password strength validation
const getPasswordStrength = (password) => {
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  
  const score = Object.values(criteria).filter(Boolean).length;
  
  return {
    criteria,
    score,
    strength: score === 4 ? 'strong' : score >= 2 ? 'medium' : 'weak'
  };
};

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = React.useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [validationErrors, setValidationErrors] = React.useState({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPasswordHints, setShowPasswordHints] = React.useState(false);
  
  const { signUp } = useAuth();

  const passwordStrength = React.useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  const handleFieldChange = React.useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setValidationErrors(prev => ({ ...prev, [field]: null }));
  }, []);

  const validateForm = React.useCallback(() => {
    const errors = {};

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSignup = React.useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signUp(
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.username.trim()
      );

      if (result.error) {
        Alert.alert('Signup Failed', result.error);
      }
      // Success - navigation handled by AuthContext
    } catch (error) {
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, signUp, validateForm]);

  const canSubmit = React.useMemo(() => {
    return (
      !isSubmitting &&
      formData.username &&
      formData.email &&
      formData.password &&
      formData.confirmPassword &&
      passwordStrength.score >= 2
    );
  }, [isSubmitting, formData, passwordStrength]);

  return (
    <ScrollView
      style={styles.wrapper}
      contentContainerStyle={styles.scrollableArea}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Create Account</Text>
          <Text style={styles.descriptionText}>
            Join WordMaster and start your language learning journey
          </Text>
        </View>

        {/* Username Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={[
              styles.inputBox,
              validationErrors.username && styles.inputBoxInvalid
            ]}
            value={formData.username}
            onChangeText={(text) => handleFieldChange('username', text)}
            placeholder="Choose a username"
            placeholderTextColor="#999999"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!isSubmitting}
          />
          {validationErrors.username && (
            <Text style={styles.validationText}>{validationErrors.username}</Text>
          )}
        </View>

        {/* Email Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={[
              styles.inputBox,
              validationErrors.email && styles.inputBoxInvalid
            ]}
            value={formData.email}
            onChangeText={(text) => handleFieldChange('email', text)}
            placeholder="your.email@example.com"
            placeholderTextColor="#999999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!isSubmitting}
          />
          {validationErrors.email && (
            <Text style={styles.validationText}>{validationErrors.email}</Text>
          )}
        </View>

        {/* Password Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={[
              styles.inputBox,
              validationErrors.password && styles.inputBoxInvalid
            ]}
            value={formData.password}
            onChangeText={(text) => handleFieldChange('password', text)}
            placeholder="Create a strong password"
            placeholderTextColor="#999999"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="next"
            onFocus={() => setShowPasswordHints(true)}
            editable={!isSubmitting}
          />
          {validationErrors.password && (
            <Text style={styles.validationText}>{validationErrors.password}</Text>
          )}
          
          {/* Password Strength Indicator */}
          {showPasswordHints && formData.password && (
            <View style={styles.passwordChecklist}>
              <PasswordCriterion
                met={passwordStrength.criteria.length}
                text="At least 8 characters"
              />
              <PasswordCriterion
                met={passwordStrength.criteria.uppercase}
                text="One uppercase letter"
              />
              <PasswordCriterion
                met={passwordStrength.criteria.lowercase}
                text="One lowercase letter"
              />
              <PasswordCriterion
                met={passwordStrength.criteria.number}
                text="One number"
              />
            </View>
          )}
        </View>

        {/* Confirm Password Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            style={[
              styles.inputBox,
              validationErrors.confirmPassword && styles.inputBoxInvalid
            ]}
            value={formData.confirmPassword}
            onChangeText={(text) => handleFieldChange('confirmPassword', text)}
            placeholder="Re-enter your password"
            placeholderTextColor="#999999"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSignup}
            editable={!isSubmitting}
          />
          {validationErrors.confirmPassword && (
            <Text style={styles.validationText}>{validationErrors.confirmPassword}</Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.createAccountBtn,
            !canSubmit && styles.createAccountBtnDisabled
          ]}
          onPress={handleSignup}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createAccountBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginPromptSection}>
          <Text style={styles.loginPromptText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            disabled={isSubmitting}
          >
            <Text style={styles.loginLinkText}>Log In</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </Text>

        {/* Back */}
        <TouchableOpacity
          style={styles.backNavigation}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        >
          <Text style={styles.backNavigationText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Password criterion component
const PasswordCriterion = ({ met, text }) => (
  <View style={styles.criterionRow}>
    <Text style={[styles.criterionIcon, met && styles.criterionIconMet]}>
      {met ? '✓' : '○'}
    </Text>
    <Text style={[styles.criterionText, met && styles.criterionTextMet]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollableArea: {
    flexGrow: 1,
    paddingBottom: 50,
  },
  container: {
    flex: 1,
    paddingHorizontal: Math.min(width * 0.08, 35),
    paddingTop: 60,
  },
  titleSection: {
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 17,
    color: '#6C6C70',
    lineHeight: 23,
  },
  inputGroup: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 9,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D1D6',
    borderRadius: 13,
    paddingVertical: 17,
    paddingHorizontal: 17,
    fontSize: 17,
    color: '#1C1C1E',
  },
  inputBoxInvalid: {
    borderColor: '#FF3B30',
  },
  validationText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 5,
    marginLeft: 4,
  },
  passwordChecklist: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
  },
  criterionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  criterionIcon: {
    fontSize: 16,
    color: '#C7C7CC',
    marginRight: 10,
    width: 20,
  },
  criterionIconMet: {
    color: '#34C759',
  },
  criterionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  criterionTextMet: {
    color: '#34C759',
  },
  createAccountBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  createAccountBtnDisabled: {
    backgroundColor: '#8E8E93',
    shadowOpacity: 0,
    elevation: 0,
  },
  createAccountBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginPromptSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#6C6C70',
  },
  loginLinkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '700',
  },
  termsText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 25,
  },
  backNavigation: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backNavigationText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default SignupScreen;
