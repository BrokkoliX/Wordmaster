import React, { useEffect, useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Edit,
  SimpleForm,
  TextInput,
  useRecordContext,
  useNotify,
  useRefresh,
  TopToolbar,
} from 'react-admin';
import {
  Box,
  Button,
  Chip,
  Typography,
  Switch,
  TextField as MuiTextField,
  CircularProgress,
  Divider,
} from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// ─── Tier badge ───────────────────────────────────────────────────────────────
const TIER_COLOR = { free: 'default', plus: 'primary', super: 'warning' };

const TierBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Chip
      label={record.name}
      color={TIER_COLOR[record.id] || 'default'}
      size="small"
      icon={<WorkspacePremiumIcon />}
    />
  );
};
TierBadge.defaultProps = { label: 'Plan' };

// ─── Feature map display (read-only, for the list datagrid) ──────────────────
const FeatureSummary = () => {
  const record = useRecordContext();
  if (!record?.features) return null;
  const keys = Object.keys(record.features);
  return (
    <Typography variant="caption" color="text.secondary">
      {keys.length} feature{keys.length !== 1 ? 's' : ''} configured
    </Typography>
  );
};
FeatureSummary.defaultProps = { label: 'Features' };

// ─── Dynamic feature editor ───────────────────────────────────────────────────
const FeatureEditor = ({ features, featureKeys, onChange }) => {
  if (!featureKeys || !features) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Feature Gates
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {Object.entries(featureKeys).map(([key, meta]) => {
        if (!meta.public) return null; // Internal keys not shown in the UI
        const value = features[key];

        return (
          <Box
            key={key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {meta.type === 'number' ? 'Limit (0 = unlimited)' : 'On / Off'}
              </Typography>
            </Box>

            {meta.type === 'boolean' ? (
              <Switch
                checked={!!value}
                onChange={(e) => onChange(key, e.target.checked)}
                color="primary"
              />
            ) : (
              <MuiTextField
                type="number"
                size="small"
                value={value ?? 0}
                onChange={(e) => onChange(key, Number(e.target.value))}
                inputProps={{ min: 0 }}
                sx={{ width: 100 }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

// ─── Custom edit form with live feature editor ────────────────────────────────
const SubscriptionPlanEditForm = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();

  const [featureKeys, setFeatureKeys] = useState(null);
  const [features, setFeatures] = useState(record?.features || {});
  const [saving, setSaving] = useState(false);

  // Fetch the KNOWN_FEATURE_KEYS allowlist from the backend.
  useEffect(() => {
    fetch(`${API_URL}/subscription-plans/feature-keys`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setFeatureKeys(data.featureKeys))
      .catch(() => notify('Failed to load feature keys', { type: 'error' }));
  }, []);

  // Keep local features in sync if the record changes.
  useEffect(() => {
    if (record?.features) setFeatures(record.features);
  }, [record]);

  const handleFeatureChange = (key, value) => {
    setFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/subscription-plans/${record.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ features }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || 'Save failed');
      }

      notify('Plan updated successfully', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err.message || 'Failed to save plan', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600 }}>
      <SimpleForm toolbar={false}>
        <TextInput source="id" disabled fullWidth />
        <TextInput source="name" fullWidth />
        <TextInput source="description" multiline fullWidth />
      </SimpleForm>

      {featureKeys ? (
        <FeatureEditor
          features={features}
          featureKeys={featureKeys}
          onChange={handleFeatureChange}
        />
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? 'Saving…' : 'Save Plan'}
        </Button>
      </Box>
    </Box>
  );
};

// ─── LIST ─────────────────────────────────────────────────────────────────────
export const SubscriptionPlanList = () => (
  <List
    actions={<TopToolbar />}
    sort={{ field: 'id', order: 'ASC' }}
    pagination={false}
    exporter={false}
  >
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TierBadge source="id" />
      <TextField source="description" />
      <FeatureSummary source="features" />
      <DateField source="updated_at" label="Last Updated" showTime />
    </Datagrid>
  </List>
);

// ─── EDIT ─────────────────────────────────────────────────────────────────────
export const SubscriptionPlanEdit = () => (
  <Edit title="Edit Subscription Plan">
    <SubscriptionPlanEditForm />
  </Edit>
);
