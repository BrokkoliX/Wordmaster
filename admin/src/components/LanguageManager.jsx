import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  LinearProgress,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNotify } from 'react-admin';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Hub model configuration (mirrors shared/constants/languages.js)
const LANGUAGES = {
  en: { name: 'English',    flag: '\u{1F1EC}\u{1F1E7}', hub: true  },
  es: { name: 'Spanish',    flag: '\u{1F1EA}\u{1F1F8}', hub: false },
  fr: { name: 'French',     flag: '\u{1F1EB}\u{1F1F7}', hub: true  },
  de: { name: 'German',     flag: '\u{1F1E9}\u{1F1EA}', hub: true  },
  hu: { name: 'Hungarian',  flag: '\u{1F1ED}\u{1F1FA}', hub: false },
  pt: { name: 'Portuguese', flag: '\u{1F1F5}\u{1F1F9}', hub: true  },
  ru: { name: 'Russian',    flag: '\u{1F1F7}\u{1F1FA}', hub: false },
};

const HUBS = Object.entries(LANGUAGES).filter(([, v]) => v.hub).map(([k]) => k);
const ALL_LANGS = Object.keys(LANGUAGES);

// Build expected pairs from hub model
function buildExpectedPairs() {
  const seen = new Set();
  const pairs = [];
  for (const hub of HUBS) {
    for (const lang of ALL_LANGS) {
      if (lang === hub) continue;
      const key = [hub, lang].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ source: hub, target: lang });
    }
  }
  return pairs;
}

const EXPECTED_PAIRS = buildExpectedPairs();

const StatusIcon = ({ status }) => {
  if (status === 'complete') return <CheckCircleIcon sx={{ color: '#4caf50' }} fontSize="small" />;
  if (status === 'partial') return <WarningIcon sx={{ color: '#ff9800' }} fontSize="small" />;
  return <CancelIcon sx={{ color: '#bdbdbd' }} fontSize="small" />;
};

const LanguageManager = () => {
  const [liveData, setLiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await fetch(`${API_URL}/languages`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Fetch failed');
        const json = await res.json();
        setLiveData(json.languages || []);
      } catch (err) {
        notify('Failed to load language data', { type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchLanguages();
  }, [notify]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Build lookup of live pair data
  const liveMap = {};
  for (const row of liveData) {
    const fwd = `${row.source_lang}-${row.target_lang}`;
    liveMap[fwd] = row;
  }

  // Compute status for each expected pair (both directions)
  const pairStatus = EXPECTED_PAIRS.map((pair) => {
    const fwdKey = `${pair.source}-${pair.target}`;
    const revKey = `${pair.target}-${pair.source}`;
    const fwd = liveMap[fwdKey];
    const rev = liveMap[revKey];

    const fwdCount = fwd?.word_count || 0;
    const revCount = rev?.word_count || 0;
    const total = fwdCount + revCount;

    let status = 'missing';
    if (total > 10000) status = 'complete';
    else if (total > 0) status = 'partial';

    return {
      ...pair,
      fwdCount,
      revCount,
      total,
      status,
      fwdCefr: fwd?.cefr_breakdown || {},
      revCefr: rev?.cefr_breakdown || {},
    };
  });

  const totalExpected = EXPECTED_PAIRS.length * 2; // bidirectional
  const totalComplete = pairStatus.filter((p) => p.status === 'complete').length;
  const totalPartial = pairStatus.filter((p) => p.status === 'partial').length;
  const totalMissing = pairStatus.filter((p) => p.status === 'missing').length;
  const overallPct = ((totalComplete / EXPECTED_PAIRS.length) * 100).toFixed(0);

  return (
    <Box p={2}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Language Management
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Wordmaster uses a hub-language model. Four hubs (EN, FR, DE, PT) pair with every
        supported language. Pairs between non-hub languages are not generated.
      </Alert>

      {/* Summary cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="overline">Expected Pairs</Typography>
              <Typography variant="h4" fontWeight={700}>{EXPECTED_PAIRS.length}</Typography>
              <Typography variant="body2" color="textSecondary">
                {EXPECTED_PAIRS.length * 2} directed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="overline">Complete</Typography>
              <Typography variant="h4" fontWeight={700} color="success.main">{totalComplete}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="overline">Partial</Typography>
              <Typography variant="h4" fontWeight={700} color="warning.main">{totalPartial}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" variant="overline">Missing</Typography>
              <Typography variant="h4" fontWeight={700} color="text.disabled">{totalMissing}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overall progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body1" fontWeight={600} sx={{ minWidth: 100 }}>
              Overall: {overallPct}%
            </Typography>
            <Box flex={1}>
              <LinearProgress
                variant="determinate"
                value={parseFloat(overallPct)}
                sx={{ height: 12, borderRadius: 1 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Hub sections */}
      {HUBS.map((hub) => {
        const hubLang = LANGUAGES[hub];
        const hubPairs = pairStatus.filter((p) => p.source === hub || p.target === hub);

        // Deduplicate: only show pairs where this hub is .source (since pairs are canonical)
        const canonical = hubPairs.filter((p) => p.source === hub);

        return (
          <Card key={hub} sx={{ mb: 3 }}>
            <CardHeader
              title={`${hubLang.flag} ${hubLang.name} Hub`}
              subheader={`${canonical.filter((p) => p.status === 'complete').length}/${canonical.length} pairs complete`}
            />
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Pair</TableCell>
                      <TableCell align="right">{hub.toUpperCase()} → X</TableCell>
                      <TableCell align="right">X → {hub.toUpperCase()}</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>A1-B1 Coverage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {canonical.map((p) => {
                      const other = p.target === hub ? p.source : p.target;
                      const otherLang = LANGUAGES[other];

                      // A1-B1 coverage (most important levels)
                      const beginnerLevels = ['A1', 'A2', 'B1'];
                      const beginnerCount = beginnerLevels.reduce(
                        (sum, lvl) => sum + (p.fwdCefr[lvl] || 0), 0
                      );
                      // 3000 = max expected for A1-B1 (500 + 1000 + 1500)
                      const beginnerPct = Math.min(100, (beginnerCount / 3000) * 100);

                      return (
                        <TableRow key={`${p.source}-${p.target}`}>
                          <TableCell><StatusIcon status={p.status} /></TableCell>
                          <TableCell>
                            {hubLang.flag} {hub.toUpperCase()} ↔ {otherLang?.flag} {other.toUpperCase()}
                          </TableCell>
                          <TableCell align="right">{p.fwdCount.toLocaleString()}</TableCell>
                          <TableCell align="right">{p.revCount.toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <strong>{p.total.toLocaleString()}</strong>
                          </TableCell>
                          <TableCell sx={{ width: 200 }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinearProgress
                                variant="determinate"
                                value={beginnerPct}
                                sx={{
                                  flex: 1,
                                  height: 8,
                                  borderRadius: 1,
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor:
                                      beginnerPct >= 80 ? '#4caf50' :
                                      beginnerPct >= 40 ? '#ff9800' : '#f44336',
                                  },
                                }}
                              />
                              <Typography variant="caption" sx={{ minWidth: 35 }}>
                                {beginnerPct.toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      })}

      {/* Hub legend */}
      <Card>
        <CardHeader title="Hub Model Legend" />
        <CardContent>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {ALL_LANGS.map((code) => {
              const lang = LANGUAGES[code];
              return (
                <Chip
                  key={code}
                  label={`${lang.flag} ${lang.name}`}
                  variant={lang.hub ? 'filled' : 'outlined'}
                  color={lang.hub ? 'primary' : 'default'}
                />
              );
            })}
          </Box>
          <Typography variant="body2" color="textSecondary">
            Filled chips are hub languages. Each hub pairs with every other language.
            Pairs between two non-hub languages (e.g., HU-RU) are not generated.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LanguageManager;
