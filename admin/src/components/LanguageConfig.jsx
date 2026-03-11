import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  TextField,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HubIcon from '@mui/icons-material/Hub';
import { useNotify } from 'react-admin';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// ── Static language / pair metadata (mirrors shared/constants/languages.js) ───

const LANGUAGES = {
  en: { name: 'English',    flag: '🇬🇧', hub: true  },
  es: { name: 'Spanish',    flag: '🇪🇸', hub: false },
  fr: { name: 'French',     flag: '🇫🇷', hub: true  },
  de: { name: 'German',     flag: '🇩🇪', hub: true  },
  hu: { name: 'Hungarian',  flag: '🇭🇺', hub: false },
  pt: { name: 'Portuguese', flag: '🇵🇹', hub: true  },
  ru: { name: 'Russian',    flag: '🇷🇺', hub: false },
  it: { name: 'Italian',    flag: '🇮🇹', hub: true  },
  nl: { name: 'Dutch',      flag: '🇳🇱', hub: false },
  pl: { name: 'Polish',     flag: '🇵🇱', hub: false },
  cs: { name: 'Czech',      flag: '🇨🇿', hub: false },
};

const HUBS = Object.entries(LANGUAGES).filter(([, v]) => v.hub).map(([k]) => k);
const ALL_LANGS = Object.keys(LANGUAGES);

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

// Learning features with display label and a tooltip explaining data requirements
const FEATURES = [
  {
    key: 'multiple_choice',
    label: 'Multiple Choice',
    abbr: 'MC',
    tooltip: 'Requires vocabulary words for the pair.',
  },
  {
    key: 'matching_pairs',
    label: 'Matching Pairs',
    abbr: 'MP',
    tooltip: 'Requires vocabulary words for the pair.',
  },
  {
    key: 'type_translation',
    label: 'Type Translation',
    abbr: 'TT',
    tooltip: 'Requires vocabulary words for the pair.',
  },
  {
    key: 'fill_in_blank',
    label: 'Fill in the Blank',
    abbr: 'FB',
    tooltip: 'Requires sentence_templates data for the target language.',
  },
  {
    key: 'smart_review',
    label: 'Smart Review',
    abbr: 'SR',
    tooltip: 'Requires sufficient user progress history.',
  },
];

// ── Small components ──────────────────────────────────────────────────────────

const EnabledBadge = ({ enabled }) =>
  enabled ? (
    <CheckCircleIcon fontSize="small" sx={{ color: '#4caf50' }} />
  ) : (
    <RadioButtonUncheckedIcon fontSize="small" sx={{ color: '#bdbdbd' }} />
  );

const FeatureChip = ({ featureKey, label, abbr, tooltip, enabled, pairEnabled, onChange }) => {
  const chip = (
    <Chip
      label={abbr}
      size="small"
      variant={enabled ? 'filled' : 'outlined'}
      color={enabled ? 'primary' : 'default'}
      onClick={pairEnabled ? () => onChange(featureKey, !enabled) : undefined}
      sx={{
        cursor: pairEnabled ? 'pointer' : 'not-allowed',
        opacity: pairEnabled ? 1 : 0.4,
        fontWeight: 700,
        minWidth: 32,
      }}
    />
  );

  return (
    <Tooltip title={pairEnabled ? `${label}: ${tooltip}` : 'Enable the pair first'} arrow>
      <span>{chip}</span>
    </Tooltip>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const LanguageConfig = () => {
  const [tab, setTab] = useState(0);
  const [configs, setConfigs] = useState({});      // id → config row
  const [wordCounts, setWordCounts] = useState({}); // "src-tgt" → count
  const [sentenceCounts, setSentenceCounts] = useState({}); // lang → count
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);       // id being saved
  const [notes, setNotes] = useState({});           // local notes edits
  const notify = useNotify();

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/language-config`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch configs');
      const json = await res.json();

      const map = {};
      const notesMap = {};
      for (const row of json.configs) {
        map[row.id] = row;
        notesMap[row.id] = row.notes || '';
      }
      setConfigs(map);
      setNotes(notesMap);
    } catch {
      notify('Failed to load language config', { type: 'error' });
    }
  }, [notify]);

  const loadWordCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/languages`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      const map = {};
      for (const row of json.languages || []) {
        map[`${row.source_lang}-${row.target_lang}`] = row.word_count;
      }
      setWordCounts(map);
    } catch {
      // Word counts are informational – silently ignore on failure
    }
  }, []);

  const loadSentenceCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sentences?limit=1`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      // We only need per-language counts; query each language via the
      // existing sentences endpoint. Since the endpoint doesn't expose
      // aggregated counts we use a rough proxy: word-count existence.
      // A dedicated query would be ideal but requires a new endpoint.
      // For now, derive from sentence data returned by language filter.
      const counts = {};
      for (const lang of ALL_LANGS) {
        const r = await fetch(
          `${API_URL}/sentences?language=${lang}&limit=1`,
          { headers: getAuthHeaders() }
        );
        if (r.ok) {
          const j = await r.json();
          counts[lang] = j.sentences?.length > 0 ? 1 : 0;
        }
      }
      setSentenceCounts(counts);
    } catch {
      // Informational only
    }
  }, []);

  useEffect(() => {
    Promise.all([loadConfigs(), loadWordCounts(), loadSentenceCounts()]).finally(() =>
      setLoading(false)
    );
  }, [loadConfigs, loadWordCounts, loadSentenceCounts]);

  // ── Persist helpers ─────────────────────────────────────────────────────────

  const save = useCallback(
    async (id, type, patch) => {
      setSaving(id);
      try {
        const res = await fetch(`${API_URL}/language-config/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ type, ...patch }),
        });
        const json = await res.json();
        if (!res.ok) {
          notify(json.error?.message || 'Save failed', { type: 'error' });
          return;
        }
        setConfigs((prev) => ({ ...prev, [id]: json.config }));
        if (json.warnings?.length) {
          notify(json.warnings[0], { type: 'warning' });
        }
      } catch {
        notify('Network error – could not save', { type: 'error' });
      } finally {
        setSaving(null);
      }
    },
    [notify]
  );

  const toggleEnabled = (id, type, currentEnabled) =>
    save(id, type, { enabled: !currentEnabled });

  const toggleFeature = (pairId, featureKey, currentValue) => {
    const existing = configs[pairId]?.features || {};
    save(pairId, 'pair', { features: { ...existing, [featureKey]: !currentValue } });
  };

  const saveNotes = (id, type) =>
    save(id, type, { notes: notes[id] || '' });

  // ── Render helpers ──────────────────────────────────────────────────────────

  const getConfig = (id) => configs[id] || { enabled: false, features: {} };

  const pairHasWords = (src, tgt) =>
    (wordCounts[`${src}-${tgt}`] || 0) + (wordCounts[`${tgt}-${src}`] || 0) > 0;

  const langHasSentences = (lang) => (sentenceCounts[lang] || 0) > 0;

  // ── Tab 0: Languages ────────────────────────────────────────────────────────

  const renderLanguagesTab = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>On</TableCell>
            <TableCell>Language</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Words (any pair)</TableCell>
            <TableCell>Notes</TableCell>
            <TableCell>Last updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ALL_LANGS.map((code) => {
            const lang = LANGUAGES[code];
            const cfg = getConfig(code);
            const isSaving = saving === code;

            // Total word count across all pairs involving this language
            const totalWords = Object.entries(wordCounts)
              .filter(([key]) => key.startsWith(`${code}-`) || key.endsWith(`-${code}`))
              .reduce((sum, [, v]) => sum + v, 0);

            return (
              <TableRow key={code} hover>
                <TableCell>
                  {isSaving ? (
                    <CircularProgress size={18} />
                  ) : (
                    <Switch
                      checked={cfg.enabled}
                      onChange={() => toggleEnabled(code, 'language', cfg.enabled)}
                      size="small"
                      color="success"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography>{lang.flag}</Typography>
                    <Typography fontWeight={600}>{lang.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {code.toUpperCase()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {lang.hub ? (
                    <Chip
                      icon={<HubIcon />}
                      label="Hub"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Chip label="Standard" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {totalWords > 0 ? totalWords.toLocaleString() : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      value={notes[code] ?? ''}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [code]: e.target.value }))
                      }
                      onBlur={() => saveNotes(code, 'language')}
                      size="small"
                      placeholder="Admin notes…"
                      variant="standard"
                      sx={{ minWidth: 160 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="textSecondary">
                    {cfg.updated_at ? new Date(cfg.updated_at).toLocaleDateString() : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ── Tab 1: Language pairs ───────────────────────────────────────────────────

  const renderPairsTab = () => (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        Toggle pairs on to make them available in the mobile app. Then enable individual
        learning features per pair based on available data.
        <strong> Fill in the Blank</strong> requires sentence template data;
        <strong> Smart Review</strong> requires user progress history.
      </Alert>

      {HUBS.map((hub) => {
        const hubLang = LANGUAGES[hub];
        const hubPairs = EXPECTED_PAIRS.filter((p) => p.source === hub);

        return (
          <Card key={hub} sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography>{hubLang.flag}</Typography>
                  <Typography fontWeight={700}>{hubLang.name} Hub</Typography>
                </Box>
              }
              subheader={`${hubPairs.filter((p) => getConfig(`${p.source}-${p.target}`).enabled).length} / ${hubPairs.length} pairs enabled`}
            />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}>On</TableCell>
                      <TableCell>Pair</TableCell>
                      <TableCell align="right">Words</TableCell>
                      <TableCell>Features</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hubPairs.map((pair) => {
                      const pairId = `${pair.source}-${pair.target}`;
                      const cfg = getConfig(pairId);
                      const isSaving = saving === pairId;
                      const hasWords = pairHasWords(pair.source, pair.target);
                      const fwdCount = wordCounts[pairId] || 0;
                      const revCount = wordCounts[`${pair.target}-${pair.source}`] || 0;
                      const otherLang = LANGUAGES[pair.target];

                      return (
                        <TableRow key={pairId} hover>
                          <TableCell>
                            {isSaving ? (
                              <CircularProgress size={18} />
                            ) : (
                              <Tooltip
                                title={!hasWords ? 'No word data exists for this pair yet' : ''}
                                arrow
                              >
                                <span>
                                  <Switch
                                    checked={cfg.enabled}
                                    onChange={() => toggleEnabled(pairId, 'pair', cfg.enabled)}
                                    disabled={!hasWords}
                                    size="small"
                                    color="success"
                                  />
                                </span>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="body2">
                                {hubLang.flag} {hub.toUpperCase()}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">↔</Typography>
                              <Typography variant="body2">
                                {otherLang?.flag} {pair.target.toUpperCase()}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption">
                              {fwdCount > 0 || revCount > 0
                                ? `${fwdCount.toLocaleString()} / ${revCount.toLocaleString()}`
                                : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {FEATURES.map((feat) => {
                                // Fill in the Blank also needs sentences for the target language
                                const extraCheck =
                                  feat.key === 'fill_in_blank'
                                    ? langHasSentences(pair.target)
                                    : true;
                                const canEnable = cfg.enabled && extraCheck;

                                return (
                                  <FeatureChip
                                    key={feat.key}
                                    featureKey={feat.key}
                                    label={feat.label}
                                    abbr={feat.abbr}
                                    tooltip={
                                      feat.key === 'fill_in_blank' && !extraCheck
                                        ? 'No sentence templates exist for this language'
                                        : feat.tooltip
                                    }
                                    enabled={cfg.features?.[feat.key] ?? false}
                                    pairEnabled={canEnable}
                                    onChange={(key, value) => {
                                      const existing = cfg.features || {};
                                      toggleFeature(pairId, key, existing[key] ?? false);
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              value={notes[pairId] ?? ''}
                              onChange={(e) =>
                                setNotes((prev) => ({ ...prev, [pairId]: e.target.value }))
                              }
                              onBlur={() => saveNotes(pairId, 'pair')}
                              size="small"
                              placeholder="Admin notes…"
                              variant="standard"
                              sx={{ minWidth: 140 }}
                            />
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
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={6}>
        <CircularProgress />
      </Box>
    );
  }

  const enabledLanguages = ALL_LANGS.filter((c) => getConfig(c).enabled).length;
  const enabledPairs = EXPECTED_PAIRS.filter(
    (p) => getConfig(`${p.source}-${p.target}`).enabled
  ).length;

  return (
    <Box p={2}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Language & Feature Config
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={2}>
        Control which languages, language pairs, and learning features are active in the
        mobile app. Changes take effect on the user's next app launch.
      </Typography>

      {/* Summary chips */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Chip
          icon={<CheckCircleIcon />}
          label={`${enabledLanguages} / ${ALL_LANGS.length} languages enabled`}
          color={enabledLanguages > 0 ? 'success' : 'default'}
          variant="outlined"
        />
        <Chip
          icon={<CheckCircleIcon />}
          label={`${enabledPairs} / ${EXPECTED_PAIRS.length} pairs enabled`}
          color={enabledPairs > 0 ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Languages" />
        <Tab label="Language Pairs & Features" />
      </Tabs>

      {tab === 0 && renderLanguagesTab()}
      {tab === 1 && renderPairsTab()}
    </Box>
  );
};

export default LanguageConfig;
