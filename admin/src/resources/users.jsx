import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  EmailField,
  DateField,
  NumberField,
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  BooleanInput,
  Show,
  SimpleShowLayout,
  BooleanField,
  Filter,
  SearchInput,
  useRecordContext,
  TopToolbar,
  ExportButton,
  EditButton,
  ShowButton,
} from 'react-admin';
import { Chip } from '@mui/material';

// ─── Role chip with colour ─────────────────────────────────
const RoleField = () => {
  const record = useRecordContext();
  if (!record) return null;

  const colorMap = {
    superadmin: 'error',
    admin: 'warning',
    moderator: 'info',
    user: 'default',
  };

  return (
    <Chip
      label={record.role}
      color={colorMap[record.role] || 'default'}
      size="small"
    />
  );
};
RoleField.defaultProps = { label: 'Role' };

// ─── Filters ────────────────────────────────────────────────
const UserFilters = (props) => (
  <Filter {...props}>
    <SearchInput source="search" alwaysOn placeholder="Search users..." />
    <SelectInput
      source="role"
      choices={[
        { id: 'user', name: 'User' },
        { id: 'admin', name: 'Admin' },
        { id: 'moderator', name: 'Moderator' },
        { id: 'superadmin', name: 'Super Admin' },
      ]}
    />
  </Filter>
);

// ─── Actions ────────────────────────────────────────────────
const UserListActions = () => (
  <TopToolbar>
    <ExportButton />
  </TopToolbar>
);

// ─── LIST ───────────────────────────────────────────────────
export const UserList = () => (
  <List
    filters={<UserFilters />}
    actions={<UserListActions />}
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="username" />
      <EmailField source="email" />
      <RoleField source="role" />
      <BooleanField source="email_verified" label="Verified" />
      <NumberField source="words_learned" label="Words" />
      <DateField source="created_at" label="Joined" showTime={false} />
      <DateField source="last_login_at" label="Last Login" showTime />
      <EditButton />
      <ShowButton />
    </Datagrid>
  </List>
);

// ─── SHOW ───────────────────────────────────────────────────
export const UserShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="username" />
      <EmailField source="email" />
      <TextField source="first_name" label="First Name" />
      <TextField source="last_name" label="Last Name" />
      <RoleField source="role" />
      <BooleanField source="email_verified" label="Email Verified" />
      <DateField source="created_at" label="Created At" showTime />
      <DateField source="updated_at" label="Updated At" showTime />
      <DateField source="last_login_at" label="Last Login" showTime />
    </SimpleShowLayout>
  </Show>
);

// ─── EDIT ───────────────────────────────────────────────────
export const UserEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput source="username" />
      <TextInput source="email" type="email" />
      <SelectInput
        source="role"
        choices={[
          { id: 'user', name: 'User' },
          { id: 'moderator', name: 'Moderator' },
          { id: 'admin', name: 'Admin' },
          { id: 'superadmin', name: 'Super Admin' },
        ]}
      />
      <BooleanInput source="email_verified" label="Email Verified" />
    </SimpleForm>
  </Edit>
);
