import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNotify } from 'react-admin';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hu', name: 'Hungarian' },
];

const SAMPLE_JSON = `[
  {
    "word": "bonjour",
    "translation": "hello",
    "cefr_level": "A1",
    "difficulty": 1,
    "frequency_rank": 1,
    "category": "greetings"
  }
]`;

const WordImport = () => {
  const notify = useNotify();
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setJsonInput(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!targetLang) {
      notify('Please select a target language', { type: 'warning' });
      return;
    }

    let words;
    try {
      words = JSON.parse(jsonInput);
      if (!Array.isArray(words)) {
        throw new Error('JSON must be an array of word objects');
      }
    } catch (err) {
      notify(`Invalid JSON: ${err.message}`, { type: 'error' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/words/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_lang: sourceLang,
          target_lang: targetLang,
          words,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Import failed');
      }

      setResult(data);
      notify(`Imported ${data.imported} words (${data.skipped} skipped)`, {
        type: data.skipped > 0 ? 'warning' : 'success',
      });
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 900 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        📚 Bulk Word Import
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Language Pair" />
        <CardContent>
          <Box display="flex" gap={2}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Source Language</InputLabel>
              <Select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                label="Source Language"
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="h6" sx={{ alignSelf: 'center' }}>→</Typography>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Target Language</InputLabel>
              <Select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                label="Target Language"
              >
                {LANGUAGES.filter((l) => l.code !== sourceLang).map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Word Data (JSON)" />
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
            >
              Upload JSON File
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleFileUpload}
              />
            </Button>
          </Box>

          <TextField
            multiline
            fullWidth
            minRows={10}
            maxRows={20}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={SAMPLE_JSON}
            variant="outlined"
            sx={{ fontFamily: 'monospace' }}
          />

          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Each object needs at minimum: <code>word</code>, <code>translation</code>.
            Optional: <code>cefr_level</code>, <code>difficulty</code>, <code>frequency_rank</code>, <code>category</code>.
          </Typography>
        </CardContent>
      </Card>

      <Button
        variant="contained"
        size="large"
        onClick={handleImport}
        disabled={loading || !jsonInput.trim() || !targetLang}
        startIcon={loading ? <CircularProgress size={20} /> : undefined}
      >
        {loading ? 'Importing…' : 'Import Words'}
      </Button>

      {result && (
        <Alert
          severity={result.skipped > 0 ? 'warning' : 'success'}
          sx={{ mt: 3 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Import Complete
          </Typography>
          <Typography variant="body2">
            ✅ Imported: {result.imported} &nbsp;|&nbsp;
            ⚠️ Skipped: {result.skipped}
          </Typography>
          {result.errors?.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Errors:</Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.errors.map((err, i) => (
                  <li key={i}>
                    <code>{err.word}</code>: {err.error}
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </Alert>
      )}
    </Box>
  );
};

export default WordImport;
