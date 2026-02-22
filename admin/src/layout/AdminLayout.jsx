import React from 'react';
import { Layout, Menu } from 'react-admin';
import PeopleIcon from '@mui/icons-material/People';
import TranslateIcon from '@mui/icons-material/Translate';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DashboardIcon from '@mui/icons-material/Dashboard';

const AdminMenu = () => (
  <Menu>
    <Menu.DashboardItem primaryText="Dashboard" leftIcon={<DashboardIcon />} />
    <Menu.ResourceItem name="users" primaryText="Users" leftIcon={<PeopleIcon />} />
    <Menu.ResourceItem name="languages" primaryText="Languages" leftIcon={<TranslateIcon />} />
    <Menu.Item
      to="/word-import"
      primaryText="Import Words"
      leftIcon={<UploadFileIcon />}
    />
  </Menu>
);

export const AdminLayout = (props) => (
  <Layout {...props} menu={AdminMenu} />
);
