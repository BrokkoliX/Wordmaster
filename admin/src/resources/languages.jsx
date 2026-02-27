import React, { useState, useEffect } from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  FunctionField,
  useRecordContext,
  useNotify,
  useRefresh,
} from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// ── CEFR level colours ─────────────────────────────────────

const CEFR_COLORS = {
  A1: '#4caf50',
  A2: '#8bc34a',
  B1: '#ff9800',
  B2: '#ff5722',
  C1: '#e91e63',
  C2: '#9c27b0',
};

// ── Inline CEFR bar for the list view ──────────────────────

const CefrBar = () => {
  const record = useRecordContext();
  if (!record?.cefr_breakdown) return null;

  const total = record.word_count || 0;
  if (total === 0) return null;

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  return (
    <Box display="flex" height={18} width={180} borderRadius={1} overflow="hidden">
      {levels.map((lvl) => {
        const count = record.cefr_breakdown[lvl] || 0;
        const pct = (count / total) * 100;
        if (pct === 0) return null;
        return (
          <Box
            key={lvl}
            sx={{
              width: `${pct}%`,
              backgroundColor: CEFR_COLORS[lvl],
              minWidth: pct > 0 ? 2 : 0,
            }}
            title={`${lvl}: ${count.toLocaleString()}`}
          />
        );
      })}
    </Box>
  );
};

// ── Language list ──────────────────────────────────────────

export const LanguageList = () => (
  <List
    sort={{ field: 'word_count', order: 'DESC' }}
    perPage={50}
    exporter={false}
  >
    <Datagrid
      bulkActionButtons={false}
      rowClick="show"
    >
      <FunctionField
        label="Pair"
        render={(record) =>
          `${record.source_lang?.toUpperCase()} → ${record.target_lang?.toUpperCase()}`
        }
      />
      <TextField source="source_lang" label="Source" />
      <TextField source="target_lang" label="Target" />
      <NumberField source="word_count" label="Words" />
      <NumberField source="levels_available" label="CEFR Levels" />
      <TextField source="min_level" label="Min" />
      <TextField source="max_level" label="Max" />
      <FunctionField label="CEFR Distribution" render={() => <CefrBar />} />
    </Datagrid>
  </List>
);

// ── Language detail (show) page ───────────────────────────

export const LanguageShow = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();

  // Extract pair id from the URL
  const pairId = window.location.hash
    ? window.location.hash.split('/languages/')[1]?.split('/')[0]?.split('?')[0]
    : window.location.pathname.split('/languages/')[1]?.split('/')[0]?.split('?')[0];

  useEffect(() => {
    if (!pairId) return;
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/languages/${pairId}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.language);
      } catch (err) {
        notify('Failed to load language details', { type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [pairId, notify]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/languages/${pairId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Delete failed');
      const json = await res.json();
      notify(`Deleted ${json.deleted} words`, { type: 'success' });
      setDeleteOpen(false);
      refresh();
      // Navigate back to list
      window.location.hash = '#/languages';
    } catch (err) {
      notify('Failed to delete language pair', { type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={3}>
        <Typography color="error">Language pair not found.</Typography>
      </Box>
    );
  }

  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const maxCefr = Math.max(...cefrLevels.map((l) => data.cefr_breakdown[l] || 0), 1);

  return (
    <Box p={2}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          {data.source_lang.toUpperCase()} → {data.target_lang.toUpperCase()}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete Pair
          </Button>
        </Box>
      </Box>

      {/* Stats row */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="overline">Total Words</Typography>
              <Typography variant="h4" fontWeight={700}>
                {data.word_count.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="overline">CEFR Levels</Typography>
              <Typography variant="h4" fontWeight={700}>
                {cefrLevels.filter((l) => data.cefr_breakdown[l] > 0).length} / 6
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="overline">Data Sources</Typography>
              <Typography variant="h4" fontWeight={700}>
                {Object.keys(data.data_sources).length || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CEFR breakdown */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="CEFR Level Distribution" />
        <CardContent>
          {cefrLevels.map((lvl) => {
            const count = data.cefr_breakdown[lvl] || 0;
            const pct = data.word_count > 0 ? (count / data.word_count) * 100 : 0;
            return (
              <Box key={lvl} display="flex" alignItems="center" mb={1}>
                <Chip
                  label={lvl}
                  size="small"
                  sx={{
                    backgroundColor: CEFR_COLORS[lvl],
                    color: '#fff',
                    fontWeight: 700,
                    width: 48,
                    mr: 2,
                  }}
                />
                <Box flex={1} mr={2}>
                  <LinearProgress
                    variant="determinate"
                    value={(count / maxCefr) * 100}
                    sx={{
                      height: 12,
                      borderRadius: 1,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: CEFR_COLORS[lvl],
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ width: 120, textAlign: 'right' }}>
                  {count.toLocaleString()} ({pct.toFixed(1)}%)
                </Typography>
              </Box>
            );
          })}
        </CardContent>
      </Card>

      {/* Data sources */}
      {Object.keys(data.data_sources).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Data Sources" />
          <CardContent>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {Object.entries(data.data_sources).map(([source, count]) => (
                <Chip
                  key={source}
                  label={`${source}: ${count.toLocaleString()}`}
                  variant="outlined"
                  icon={<InfoIcon />}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Sample words */}
      {data.sample_words?.length > 0 && (
        <Card>
          <CardHeader title="Sample Words (by frequency)" />
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Word</TableCell>
                    <TableCell>Translation</TableCell>
                    <TableCell>CEFR</TableCell>
                    <TableCell>Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.sample_words.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>{w.frequency_rank}</TableCell>
                      <TableCell><strong>{w.word}</strong></TableCell>
                      <TableCell>{w.translation}</TableCell>
                      <TableCell>
                        <Chip
                          label={w.cefr_level}
                          size="small"
                          sx={{
                            backgroundColor: CEFR_COLORS[w.cefr_level] || '#999',
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>{w.category || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Language Pair</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all {data.word_count.toLocaleString()} words
            for {data.source_lang.toUpperCase()} → {data.target_lang.toUpperCase()}.
            User progress for these words will be orphaned. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
