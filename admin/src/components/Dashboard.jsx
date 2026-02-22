import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Typography, Grid, Box, Chip, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import BarChartIcon from '@mui/icons-material/BarChart';
import StorageIcon from '@mui/icons-material/Storage';
import { useNotify } from 'react-admin';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// ─── Stat card ─────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon: Icon, color = '#1976d2' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
            {value ?? '—'}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {Icon && (
          <Box
            sx={{
              backgroundColor: `${color}15`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ fontSize: 32, color }} />
          </Box>
        )}
      </Box>
    </CardContent>
  </Card>
);

// ─── Dashboard page ────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [wordStats, setWordStats] = useState(null);
  const [dbHealth, setDbHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const headers = getAuthHeaders();
        const [statsRes, wordRes, healthRes] = await Promise.all([
          fetch(`${API_URL}/stats`, { headers }),
          fetch(`${API_URL}/words/stats`, { headers }),
          fetch(`${API_URL}/database/health`, { headers }),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (wordRes.ok) setWordStats(await wordRes.json());
        if (healthRes.ok) setDbHealth(await healthRes.json());
      } catch (err) {
        notify('Failed to load dashboard data', { type: 'error' });
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [notify]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        📊 WordMaster Dashboard
      </Typography>

      {/* ── Top-level stats ──────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats?.users?.total?.toLocaleString()}
            subtitle={`${stats?.users?.active ?? 0} active (30 d)`}
            icon={PeopleIcon}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Words in Database"
            value={wordStats?.total?.toLocaleString()}
            icon={MenuBookIcon}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Learning Sessions"
            value={stats?.sessions?.toLocaleString()}
            icon={SchoolIcon}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Accuracy"
            value={stats?.averageAccuracy ? `${stats.averageAccuracy}%` : '—'}
            icon={BarChartIcon}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* ── Words by Language ────────────────────────── */}
      {wordStats?.byLanguagePair?.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Words by Language Pair" />
          <CardContent>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {wordStats.byLanguagePair.map((lp) => (
                <Chip
                  key={`${lp.source_lang}-${lp.target_lang}`}
                  label={`${lp.source_lang.toUpperCase()} → ${lp.target_lang.toUpperCase()}: ${Number(lp.count).toLocaleString()} words`}
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Words by CEFR Level ──────────────────────── */}
      {wordStats?.byCefrLevel?.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Words by CEFR Level" />
          <CardContent>
            <Grid container spacing={2}>
              {wordStats.byCefrLevel.map((level) => (
                <Grid item xs={6} sm={4} md={2} key={level.cefr_level}>
                  <Box textAlign="center">
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {Number(level.count).toLocaleString()}
                    </Typography>
                    <Chip
                      label={level.cefr_level}
                      size="small"
                      color={
                        level.cefr_level <= 'A2'
                          ? 'success'
                          : level.cefr_level <= 'B2'
                            ? 'warning'
                            : 'error'
                      }
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ── Database Health ──────────────────────────── */}
      {dbHealth && (
        <Card>
          <CardHeader
            title="Database Health"
            avatar={<StorageIcon color={dbHealth.status === 'healthy' ? 'success' : 'error'} />}
          />
          <CardContent>
            <Typography variant="body1" gutterBottom>
              Status: <strong>{dbHealth.status}</strong> &nbsp;|&nbsp; Size: <strong>{dbHealth.database_size}</strong>
            </Typography>
            {dbHealth.tables?.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Table sizes:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {dbHealth.tables.map((t) => (
                    <Chip
                      key={t.tablename}
                      label={`${t.tablename}: ${t.size}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;
