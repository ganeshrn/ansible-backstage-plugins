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
import { Typography, makeStyles } from '@material-ui/core';
import { InfoCard, Link } from '@backstage/core-components';

import ansibleWave from '../../../images/ansible-wave.png';


const useStyles = makeStyles({
  flex: {
    display: 'flex',
  },
  fw_700: {
    fontWeight: 700,
  },
  img_wave: {
    width: '70px',
    height: '70px',
    margin: '5px',
  },
  p16: {
    padding: 16,
    paddingLeft: '0.5rem'
  },
  fontSize14: {
    fontSize: '14px',
  },
});

export const GettingStarted = ({ onTabChange }) => {
  const classes = useStyles();
  return (
    <InfoCard noPadding>
      <Typography className={`${classes.flex} ${classes.fontSize14}`}>
        <img className={classes.img_wave} src={ansibleWave} alt="Hello!" />
        <Typography component="span" className={classes.p16}>
          <Typography component="span" className={`${classes.fw_700}`}>
            Welcome to Ansible Developer Hub!<br />
          </Typography>
          Let’s help you get on your way and become an Ansible developer. Go to
          the&nbsp;
          <Link
            to="../learn"
            onClick={e => {
              e.stopPropagation();
              onTabChange(3);
            }}
          >
            Learn tab&nbsp;
          </Link>
          to get started.
        </Typography>
      </Typography>
    </InfoCard>
  );
};
