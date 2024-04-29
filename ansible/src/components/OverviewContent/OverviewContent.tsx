/*
 * Copyright 2024 The Ansible plugin Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import {
  Grid,
} from '@material-ui/core';
import { QuickAccessCard } from './QuickAccessCard';
import { Favourites } from './Favourites';
import { GettingStarted } from './GettingStarted';
import { SearchType } from '@backstage/plugin-search';
import { CatalogIcon, DocsIcon } from '@backstage/core-components';
import UsersGroupsIcon from '@material-ui/icons/Person';
import { SearchContextProvider } from '@backstage/plugin-search-react';


type IProps = {
  onTabChange: (index: number) => void;
};

export const EntityOverviewContent = (props: IProps) => {
  return (
    <Grid container spacing={2} justifyContent="space-between">
      <Grid item xs={12}>
        <GettingStarted {...props} />
      </Grid>
      <Grid item xs={9}>
        <QuickAccessCard />
      </Grid>
      <Grid item xs={3}>
        <Favourites />
      </Grid>
    </Grid>
  );
};
