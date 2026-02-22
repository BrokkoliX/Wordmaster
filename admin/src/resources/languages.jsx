import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  FunctionField,
} from 'react-admin';

/**
 * Language pairs list.
 *
 * The backend returns an array under the "languages" key with fields:
 *   source_lang, target_lang, word_count, levels_available, min_level, max_level
 *
 * Each row doesn't have a native "id", so we synthesise one from the
 * language pair for react-admin's requirements (see App.jsx recordRepresentation).
 */
export const LanguageList = () => (
  <List
    sort={{ field: 'word_count', order: 'DESC' }}
    perPage={50}
    exporter={false}
  >
    <Datagrid bulkActionButtons={false}>
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
      <TextField source="min_level" label="Min Level" />
      <TextField source="max_level" label="Max Level" />
    </Datagrid>
  </List>
);
