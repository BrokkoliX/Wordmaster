import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  BooleanField,
  Show,
  SimpleShowLayout,
  Edit,
  SimpleForm,
  Create,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
  Filter,
  SearchInput,
  useRecordContext,
  TopToolbar,
  ExportButton,
  EditButton,
  ShowButton,
  CreateButton,
  DeleteButton,
} from 'react-admin';
import { Chip, Box, Typography } from '@mui/material';

const RARITY_OPTIONS = [
  { id: 'common', name: 'Common' },
  { id: 'uncommon', name: 'Uncommon' },
  { id: 'rare', name: 'Rare' },
  { id: 'epic', name: 'Epic' },
  { id: 'legendary', name: 'Legendary' },
];

const CATEGORY_OPTIONS = [
  { id: 'first_steps', name: 'First Steps' },
  { id: 'streaks', name: 'Streaks' },
  { id: 'mastery', name: 'Mastery' },
  { id: 'speed', name: 'Speed' },
  { id: 'accuracy', name: 'Accuracy' },
  { id: 'explorer', name: 'Explorer' },
  { id: 'special', name: 'Special' },
];

const RARITY_COLOR_MAP = {
  common: 'default',
  uncommon: 'success',
  rare: 'info',
  epic: 'secondary',
  legendary: 'warning',
};

const RarityChip = () => {
  const record = useRecordContext();
  if (!record) return null;
  const color = RARITY_COLOR_MAP[record.rarity] || 'default';
  return <Chip label={record.rarity} color={color} size="small" />;
};
RarityChip.defaultProps = { label: 'Rarity' };

const CategoryChip = () => {
  const record = useRecordContext();
  if (!record) return null;
  const found = CATEGORY_OPTIONS.find((c) => c.id === record.category);
  const display = found ? found.name : record.category;
  return <Chip label={display} variant="outlined" size="small" />;
};
CategoryChip.defaultProps = { label: 'Category' };

const IconDisplay = () => {
  const record = useRecordContext();
  if (!record) return null;
  return <span style={{ fontSize: '1.4rem' }}>{record.icon}</span>;
};
IconDisplay.defaultProps = { label: 'Icon' };

const AchievementFilters = (props) => (
  <Filter {...props}>
    <SearchInput source="search" alwaysOn placeholder="Search achievements..." />
    <SelectInput source="category" choices={CATEGORY_OPTIONS} />
    <SelectInput source="rarity" choices={RARITY_OPTIONS} />
  </Filter>
);

const AchievementListToolbar = () => (
  <TopToolbar>
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

export const AchievementList = () => (
  <List
    filters={<AchievementFilters />}
    actions={<AchievementListToolbar />}
    sort={{ field: 'order_index', order: 'ASC' }}
    perPage={25}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <IconDisplay source="icon" />
      <TextField source="id" label="ID" />
      <TextField source="title" />
      <CategoryChip source="category" />
      <RarityChip source="rarity" />
      <NumberField source="points" />
      <BooleanField source="hidden" />
      <NumberField source="order_index" label="Order" />
      <NumberField source="times_unlocked" label="Unlocks" sortable={false} />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);

export const AchievementShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" label="Achievement ID" />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconDisplay source="icon" />
        <Typography variant="h6" component="span">
          <TextField source="title" />
        </Typography>
      </Box>
      <TextField source="description" />
      <CategoryChip source="category" />
      <RarityChip source="rarity" />
      <NumberField source="points" />
      <BooleanField source="hidden" />
      <NumberField source="order_index" label="Order" />
      <TextField source="unlock_criteria" label="Unlock Criteria (JSON)" />
      <NumberField source="times_unlocked" label="Times Unlocked" />
      <NumberField source="times_completed" label="Times Completed" />
      <DateField source="created_at" label="Created" showTime />
      <DateField source="updated_at" label="Updated" showTime />
    </SimpleShowLayout>
  </Show>
);

export const AchievementEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput source="title" fullWidth />
      <TextInput source="description" multiline fullWidth />
      <TextInput source="icon" label="Icon (emoji)" />
      <SelectInput source="category" choices={CATEGORY_OPTIONS} />
      <SelectInput source="rarity" choices={RARITY_OPTIONS} />
      <NumberInput source="points" min={0} />
      <NumberInput source="order_index" label="Display Order" />
      <BooleanInput source="hidden" label="Hidden Achievement" />
    </SimpleForm>
  </Edit>
);

export const AchievementCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="id" label="Unique ID (e.g. streak_50)" fullWidth helperText="Lowercase with underscores, cannot be changed later" />
      <TextInput source="title" fullWidth />
      <TextInput source="description" multiline fullWidth />
      <TextInput source="icon" label="Icon (emoji)" defaultValue="🏆" />
      <SelectInput source="category" choices={CATEGORY_OPTIONS} defaultValue="first_steps" />
      <SelectInput source="rarity" choices={RARITY_OPTIONS} defaultValue="common" />
      <NumberInput source="points" min={0} defaultValue={10} />
      <NumberInput source="order_index" label="Display Order" defaultValue={0} />
      <BooleanInput source="hidden" label="Hidden Achievement" defaultValue={false} />
    </SimpleForm>
  </Create>
);
