import React from 'react';
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import TranslateIcon from '@mui/icons-material/Translate';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

import dataProvider from './dataProvider';
import authProvider from './authProvider';
import Dashboard from './components/Dashboard';
import WordImport from './components/WordImport';
import DatabaseQuery from './components/DatabaseQuery';
import LanguageManager from './components/LanguageManager';
import LoginPage from './components/LoginPage';
import { UserList, UserShow, UserEdit } from './resources/users';
import { LanguageList, LanguageShow } from './resources/languages';
import { AchievementList, AchievementShow, AchievementEdit, AchievementCreate } from './resources/achievements';
import { AdminLayout } from './layout/AdminLayout';

const App = () => (
  <Admin
    dataProvider={dataProvider}
    authProvider={authProvider}
    dashboard={Dashboard}
    loginPage={LoginPage}
    layout={AdminLayout}
    title="WordMaster Admin"
    requireAuth
  >
    <Resource
      name="users"
      list={UserList}
      show={UserShow}
      edit={UserEdit}
      icon={PeopleIcon}
      options={{ label: 'Users' }}
    />
    <Resource
      name="languages"
      list={LanguageList}
      show={LanguageShow}
      icon={TranslateIcon}
      options={{ label: 'Languages' }}
    />
    <Resource
      name="achievements"
      list={AchievementList}
      show={AchievementShow}
      edit={AchievementEdit}
      create={AchievementCreate}
      icon={EmojiEventsIcon}
      options={{ label: 'Achievements' }}
    />
    <CustomRoutes>
      <Route path="/word-import" element={<WordImport />} />
      <Route path="/language-manager" element={<LanguageManager />} />
      <Route path="/database-query" element={<DatabaseQuery />} />
    </CustomRoutes>
  </Admin>
);

export default App;
