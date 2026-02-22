import React, { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || '/api/auth';

// ─── Login form ─────────────────────────────────────────────
const LoginForm = ({ onForgotPassword }) => {
  const login = useLogin();
  const notify = useNotify();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username: email, password });
    } catch (err) {
      notify(err.message || 'Invalid email or password', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        required
        margin="normal"
        autoFocus
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        required
        margin="normal"
      />
      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={loading}
        sx={{ mt: 2, mb: 1 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Sign In'}
      </Button>
      <Box textAlign="center">
        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={onForgotPassword}
          sx={{ cursor: 'pointer' }}
        >
          Forgot password?
        </Link>
      </Box>
    </form>
  );
};

// ─── Password reset flow ────────────────────────────────────
const RESET_STEPS = ['Enter email', 'Enter token & new password', 'Done'];

const ResetForm = ({ onBackToLogin }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const res = await fetch(`${AUTH_URL}/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Request failed');
      }

      // The API returns the token directly (no email service configured)
      if (data.resetToken) {
        setToken(data.resetToken);
        setInfo('Reset token generated. It has been pre-filled below.');
      } else {
        setInfo('If that email exists, a reset token was generated. Check server logs.');
      }

      setActiveStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${AUTH_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Reset failed');
      }

      setActiveStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {RESET_STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {info}
        </Alert>
      )}

      {/* Step 0: Enter email */}
      {activeStep === 0 && (
        <form onSubmit={handleRequestToken}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Enter your account email to receive a password reset token.
          </Typography>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            margin="normal"
            autoFocus
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 2, mb: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Request Reset Token'}
          </Button>
          <Box textAlign="center">
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={onBackToLogin}
            >
              Back to login
            </Link>
          </Box>
        </form>
      )}

      {/* Step 1: Enter token + new password */}
      {activeStep === 1 && (
        <form onSubmit={handleResetPassword}>
          <TextField
            label="Reset Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            fullWidth
            required
            margin="normal"
            autoFocus={!token}
            helperText="Pre-filled from server response. In production this would arrive via email."
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            required
            margin="normal"
            helperText="Minimum 8 characters"
          />
          <TextField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            required
            margin="normal"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 2, mb: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Reset Password'}
          </Button>
          <Box textAlign="center">
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => { setActiveStep(0); setError(''); setInfo(''); }}
            >
              Start over
            </Link>
          </Box>
        </form>
      )}

      {/* Step 2: Success */}
      {activeStep === 2 && (
        <Box textAlign="center">
          <Alert severity="success" sx={{ mb: 2 }}>
            Password reset successfully.
          </Alert>
          <Button variant="contained" onClick={onBackToLogin}>
            Back to Login
          </Button>
        </Box>
      )}
    </Box>
  );
};

// ─── Main login page ────────────────────────────────────────
const LoginPage = () => {
  const [showReset, setShowReset] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Card sx={{ width: 420, maxWidth: '90vw' }}>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" sx={{ mb: 3 }}>
            <LockOutlinedIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              WordMaster Admin
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {showReset ? 'Reset your password' : 'Sign in to your account'}
            </Typography>
          </Box>

          {showReset ? (
            <ResetForm onBackToLogin={() => setShowReset(false)} />
          ) : (
            <LoginForm onForgotPassword={() => setShowReset(true)} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
