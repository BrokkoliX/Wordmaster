import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useNotify } from 'react-admin';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// Human-readable category labels
const CATEGORY_LABELS = {
  rate_limits: 'Rate Limits',
};

const categoryLabel = (cat) =>
  CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ── Per-type editors ──────────────────────────────────────────────────────────

/**
 * For 'json' type settings we render individual sub-fields for each key
 * in the object rather than a raw JSON editor.
 */
const JsonSubfields = ({ settingKey, value, onChange }) => {
  // Special rendering for rate_limit.* entries:
  // { max: number, windowMs: number }
  if (settingKey.startsWith('rate_limit.')) {
    const mins = Math.round((value.windowMs || 900000) / 60000);

    return (
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
        <TextField
          label="Max requests"
          type="number"
          value={value.max ?? ''}
          onChange={(e) => onChange({ ...value, max: parseInt(e.target.value, 10) || 0 })}
          size="small"
          inputProps={{ min: 1 }}
          sx={{ width: 160 }}
        />
        <TextField
          label="Window (minutes)"
          type="number"
          value={mins}
          onChange={(e) =>
            onChange({ ...value, windowMs: (parseInt(e.target.value, 10) || 15) * 60000 })
          }
          size="small"
          inputProps={{ min: 1 }}
          sx={{ width: 160 }}
        />
      </Box>
    );
  }

  // Generic: render each key as a text field
  return (
    <Box display="flex" gap={2} flexWrap="wrap">
      {Object.entries(value).map(([k, v]) => (
        <TextField
          key={k}
          label={k}
          value={v ?? ''}
          onChange={(e) => onChange({ ...value, [k]: e.target.value })}
          size="small"
          sx={{ width: 200 }}
        />
      ))}
    </Box>
  );
};

// ── Single setting row ────────────────────────────────────────────────────────

const SettingRow = ({ setting, onSave }) => {
  const [localValue, setLocalValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Reset local state if the parent setting changes (after a save)
  useEffect(() => {
    setLocalValue(setting.value);
    setDirty(false);
  }, [setting.value]);

  const handleChange = (val) => {
    setLocalValue(val);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(setting.key, localValue);
    setSaving(false);
    setDirty(false);
  };

  const renderInput = () => {
    switch (setting.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(localValue)}
                onChange={(e) => handleChange(e.target.checked)}
                color="primary"
              />
            }
            label={localValue ? 'Enabled' : 'Disabled'}
          />
        );

      case 'number':
        return (
          <TextField
            type="number"
            value={localValue ?? ''}
            onChange={(e) => handleChange(Number(e.target.value))}
            size="small"
            sx={{ width: 180 }}
          />
        );

      case 'string':
        return (
          <TextField
            value={localValue ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            size="small"
            sx={{ width: 300 }}
          />
        );

      case 'json':
        return (
          <JsonSubfields
            settingKey={setting.key}
            value={localValue ?? {}}
            onChange={handleChange}
          />
        );

      default:
        return <Typography variant="body2" color="error">Unknown type: {setting.type}</Typography>;
    }
  };

  return (
    <Box py={1.5}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
        <Box flex={1} minWidth={200}>
          <Typography fontWeight={600} variant="body2">
            {setting.label}
          </Typography>
          {setting.notes && (
            <Typography variant="caption" color="textSecondary">
              {setting.notes}
            </Typography>
          )}
          <Box mt={0.5}>
            <Chip label={setting.key} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {renderInput()}
          <Button
            variant="contained"
            size="small"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            Save
          </Button>
        </Box>
      </Box>

      {setting.updated_at && (
        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
          <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.disabled">
            Last saved {new Date(setting.updated_at).toLocaleString()}
            {setting.updated_by ? ` by ${setting.updated_by}` : ''}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const SystemSettings = () => {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/server-config`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setGrouped(json.settings || {});
    } catch {
      notify('Failed to load system settings', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async (key, value) => {
    try {
      const res = await fetch(`${API_URL}/server-config/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ value }),
      });
      const json = await res.json();

      if (!res.ok) {
        notify(json.error?.message || 'Save failed', { type: 'error' });
        return;
      }

      // Update local state with the saved row
      const saved = json.setting;
      setGrouped((prev) => {
        const cat = saved.category;
        const updated = (prev[cat] || []).map((s) => (s.key === saved.key ? saved : s));
        return { ...prev, [cat]: updated };
      });

      notify(`"${json.setting.label}" saved`, { type: 'success' });
    } catch {
      notify('Network error — could not save', { type: 'error' });
    }
  }, [notify]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }

  const categories = Object.keys(grouped).sort();

  return (
    <Box p={2}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        System Settings
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        Changes take effect immediately — no server restart required. New setting
        categories appear automatically when rows are added to the{' '}
        <code>server_config</code> table.
      </Typography>

      {categories.length === 0 && (
        <Alert severity="info">
          No settings found. Run the <code>add_server_config.sql</code> migration to seed
          the initial values.
        </Alert>
      )}

      {categories.map((cat) => (
        <Card key={cat} sx={{ mb: 3 }}>
          <CardHeader
            title={categoryLabel(cat)}
            titleTypographyProps={{ fontWeight: 700 }}
          />
          <CardContent sx={{ pt: 0 }}>
            {grouped[cat].map((setting, idx) => (
              <React.Fragment key={setting.key}>
                {idx > 0 && <Divider />}
                <SettingRow setting={setting} onSave={handleSave} />
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default SystemSettings;
