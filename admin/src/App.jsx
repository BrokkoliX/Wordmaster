import React from 'react';
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import TranslateIcon from '@mui/icons-material/Translate';

import dataProvider from './dataProvider';
import authProvider from './authProvider';
import Dashboard from './components/Dashboard';
import WordImport from './components/WordImport';
import LoginPage from './components/LoginPage';
import { UserList, UserShow, UserEdit } from './resources/users';
import { LanguageList } from './resources/languages';
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
      icon={TranslateIcon}
      options={{ label: 'Languages' }}
    />
    <CustomRoutes>
      <Route path="/word-import" element={<WordImport />} />
    </CustomRoutes>
  </Admin>
);

export default App;
