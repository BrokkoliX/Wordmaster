import React from 'react';
import { Layout, Menu } from 'react-admin';
import PeopleIcon from '@mui/icons-material/People';
import TranslateIcon from '@mui/icons-material/Translate';
import LanguageIcon from '@mui/icons-material/Language';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

const AdminMenu = () => (
  <Menu>
    <Menu.DashboardItem primaryText="Dashboard" leftIcon={<DashboardIcon />} />
    <Menu.ResourceItem name="users" primaryText="Users" leftIcon={<PeopleIcon />} />
    <Menu.ResourceItem name="languages" primaryText="Language Pairs" leftIcon={<TranslateIcon />} />
    <Menu.ResourceItem name="achievements" primaryText="Achievements" leftIcon={<EmojiEventsIcon />} />
    <Menu.ResourceItem name="subscription-plans" primaryText="Subscription Plans" leftIcon={<WorkspacePremiumIcon />} />
    <Menu.Item
      to="/language-manager"
      primaryText="Language Manager"
      leftIcon={<LanguageIcon />}
    />
    <Menu.Item
      to="/language-config"
      primaryText="Language Config"
      leftIcon={<ToggleOnIcon />}
    />
    <Menu.Item
      to="/word-import"
      primaryText="Import Words"
      leftIcon={<UploadFileIcon />}
    />
    <Menu.Item
      to="/database-query"
      primaryText="Database Query"
      leftIcon={<StorageIcon />}
    />
  </Menu>
);

export const AdminLayout = (props) => (
  <Layout {...props} menu={AdminMenu} />
);
