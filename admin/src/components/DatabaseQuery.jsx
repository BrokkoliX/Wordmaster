import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StorageIcon from '@mui/icons-material/Storage';
import { useNotify } from 'react-admin';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const EXAMPLE_QUERIES = [
  {
    label: 'All users (recent first)',
    sql: `SELECT id, email, username, role, created_at, last_login_at
FROM users
ORDER BY created_at DESC
LIMIT 50`,
  },
  {
    label: 'Active users (last 7 days)',
    sql: `SELECT id, email, username, last_login_at
FROM users
WHERE last_login_at >= NOW() - INTERVAL '7 days'
ORDER BY last_login_at DESC`,
  },
  {
    label: 'Word counts by language pair',
    sql: `SELECT source_lang, target_lang, COUNT(*) AS word_count
FROM words
GROUP BY source_lang, target_lang
ORDER BY word_count DESC`,
  },
  {
    label: 'Words by CEFR level',
    sql: `SELECT cefr_level, COUNT(*) AS count
FROM words
GROUP BY cefr_level
ORDER BY cefr_level`,
  },
  {
    label: 'Top learners by words mastered',
    sql: `SELECT u.username, u.email, COUNT(*) AS mastered
FROM user_word_progress wp
JOIN users u ON u.id = wp.user_id
WHERE wp.confidence_level >= 3
GROUP BY u.id, u.username, u.email
ORDER BY mastered DESC
LIMIT 20`,
  },
  {
    label: 'Recent learning sessions',
    sql: `SELECT ls.id, u.username, ls.start_time, ls.words_reviewed,
       ls.correct_answers, ls.accuracy
FROM learning_sessions ls
JOIN users u ON u.id = ls.user_id
ORDER BY ls.start_time DESC
LIMIT 30`,
  },
  {
    label: 'Search words (example: Spanish)',
    sql: `SELECT id, word, translation, cefr_level, category
FROM words
WHERE target_lang = 'es'
ORDER BY frequency_rank ASC NULLS LAST
LIMIT 50`,
  },
  {
    label: 'User settings overview',
    sql: `SELECT u.username, us.learning_language, us.known_language,
       us.cefr_level, us.daily_goal, us.theme
FROM user_settings us
JOIN users u ON u.id = us.user_id
ORDER BY u.username`,
  },
];

// Format cell values for display
const formatValue = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const DatabaseQuery = () => {
  const notify = useNotify();
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(null);
  const [elapsed, setElapsed] = useState(null);

  // Fetch database schema (reusable for retry)
  const fetchSchema = useCallback(async () => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const res = await fetch(`${API_URL}/database/schema`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSchema(data.schema);
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to load schema:', err);
      setSchemaError(err.message);
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  const executeQuery = useCallback(async () => {
    if (!sql.trim()) {
      notify('Enter a SQL query first', { type: 'warning' });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setElapsed(null);

    const start = performance.now();

    try {
      const response = await fetch(`${API_URL}/database/query`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sql }),
      });

      const data = await response.json();
      const duration = Math.round(performance.now() - start);
      setElapsed(duration);

      if (!response.ok) {
        setError(data?.error?.message || 'Query failed');
        return;
      }

      setResult(data);
      notify(
        `Query returned ${data.rowCount} row${data.rowCount !== 1 ? 's' : ''} in ${duration}ms`,
        { type: 'info' }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sql, notify]);

  // Ctrl/Cmd+Enter to run
  const handleKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeQuery();
      }
    },
    [executeQuery]
  );

  const loadExample = (exampleSql) => {
    setSql(exampleSql);
    setResult(null);
    setError(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Database Query
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Execute read-only SQL queries against the WordMaster database.
        Only SELECT statements are permitted. Results are limited to 500 rows.
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Main query area */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Example queries */}
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title="Example Queries"
              titleTypographyProps={{ variant: 'subtitle1' }}
              sx={{ pb: 0 }}
            />
            <CardContent sx={{ pt: 1 }}>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {EXAMPLE_QUERIES.map((ex, i) => (
                  <Chip
                    key={i}
                    label={ex.label}
                    onClick={() => loadExample(ex.sql)}
                    variant="outlined"
                    color="primary"
                    size="small"
                    clickable
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* SQL editor */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <TextField
                multiline
                fullWidth
                minRows={6}
                maxRows={16}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="SELECT * FROM users LIMIT 10;"
                variant="outlined"
                InputProps={{
                  sx: {
                    fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  },
                }}
              />
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 1.5 }}
              >
                <Button
                  variant="contained"
                  onClick={executeQuery}
                  disabled={loading || !sql.trim()}
                  startIcon={
                    loading ? <CircularProgress size={18} /> : <PlayArrowIcon />
                  }
                >
                  {loading ? 'Running...' : 'Run Query'}
                </Button>
                <Typography variant="caption" color="textSecondary">
                  {navigator.platform?.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to run
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Query Error
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', mt: 0.5 }}
              >
                {error}
              </Typography>
            </Alert>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader
                title="Results"
                titleTypographyProps={{ variant: 'subtitle1' }}
                action={
                  <Box display="flex" alignItems="center" gap={1}>
                    {result.truncated && (
                      <Chip
                        label="Truncated to 500 rows"
                        color="warning"
                        size="small"
                      />
                    )}
                    <Chip
                      label={`${result.rowCount} row${result.rowCount !== 1 ? 's' : ''}`}
                      size="small"
                    />
                    {elapsed !== null && (
                      <Chip label={`${elapsed}ms`} size="small" variant="outlined" />
                    )}
                    <Tooltip title="Copy as JSON">
                      <IconButton
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(result.rows, null, 2)
                          );
                          notify('Copied to clipboard', { type: 'info' });
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ pt: 1, pb: '16px !important' }}>
                {result.rows.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2, textAlign: 'center' }}
                  >
                    Query returned no rows.
                  </Typography>
                ) : (
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ maxHeight: 520 }}
                  >
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {result.columns.map((col) => (
                            <TableCell
                              key={col}
                              sx={{
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                backgroundColor: '#f5f5f5',
                              }}
                            >
                              {col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.rows.map((row, idx) => (
                          <TableRow key={idx} hover>
                            {result.columns.map((col) => (
                              <TableCell
                                key={col}
                                sx={{
                                  whiteSpace: 'nowrap',
                                  maxWidth: 300,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  fontFamily:
                                    row[col] === null
                                      ? 'inherit'
                                      : '"Fira Code", monospace',
                                  fontSize: '0.82rem',
                                  color:
                                    row[col] === null ? 'text.disabled' : 'text.primary',
                                  fontStyle:
                                    row[col] === null ? 'italic' : 'normal',
                                }}
                                title={formatValue(row[col])}
                              >
                                {formatValue(row[col])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Schema sidebar */}
        <Card sx={{ width: 300, flexShrink: 0 }}>
          <CardHeader
            title="Schema Reference"
            titleTypographyProps={{ variant: 'subtitle1' }}
            avatar={<StorageIcon fontSize="small" />}
            sx={{ pb: 0 }}
          />
          <CardContent sx={{ pt: 1, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            {schemaLoading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={24} />
              </Box>
            ) : schema ? (
              Object.entries(schema).map(([table, columns]) => (
                <Accordion
                  key={table}
                  disableGutters
                  elevation={0}
                  sx={{
                    '&:before': { display: 'none' },
                    border: '1px solid',
                    borderColor: 'divider',
                    mb: 1,
                    borderRadius: '4px !important',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                      }}
                    >
                      {table}
                      <Typography
                        component="span"
                        variant="caption"
                        color="textSecondary"
                        sx={{ ml: 1 }}
                      >
                        ({columns.length})
                      </Typography>
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Divider sx={{ mb: 1 }} />
                    {columns.map((col) => (
                      <Box
                        key={col.column}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 0.3,
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderRadius: 0.5,
                          px: 0.5,
                        }}
                        onClick={() => {
                          navigator.clipboard.writeText(col.column);
                          notify(`Copied: ${col.column}`, { type: 'info' });
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                          }}
                        >
                          {col.column}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ fontSize: '0.7rem' }}
                        >
                          {col.type}
                        </Typography>
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Box textAlign="center" py={2}>
                <Typography variant="body2" color="error" gutterBottom>
                  {schemaError || 'Failed to load schema.'}
                </Typography>
                <Button size="small" variant="outlined" onClick={fetchSchema}>
                  Retry
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default DatabaseQuery;
