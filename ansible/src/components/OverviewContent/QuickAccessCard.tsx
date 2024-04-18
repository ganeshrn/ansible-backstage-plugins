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
import { GitHubIcon, InfoCard } from '@backstage/core-components';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Divider,
  Grid,
  Typography,
  makeStyles,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import {
  IQuickAccessLinks,
  ansibleWorkspaces,
  developerTools,
  discoverContent,
  links,
} from './quickAccessData';
import { WorkspaceIcon } from '../WorkspaceIcon';
import { DocumentIcon } from '../DocumentIcon';

export type QuickAccessProps = {
  data: IQuickAccessLinks;
  expanded?: boolean;
};

const useStyles = makeStyles(theme => ({
  ml25: {
    marginLeft: '25px',
  },
  fontSize14: {
    fontSize: '14px',
  },
  description: {
    marginBottom: '30px',
  },
  t_align_c: {
    textAlign: 'center',
  },
  link: {
    display: 'flex',
    gap: '24px',
    listStyle: 'none',
    paddingLeft: '16px',
  },
  a_link: {
    display: 'block',
    margin: '4px 8px',
    textDecoration: 'none',
  },
  icon_style: {
    display: 'inline-block',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: theme.palette.type === 'light' ? '#F8F8F8' : '',
    textAlign: 'center',
    lineHeight: '32px',
    boxShadow:
      '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
  },
  icon_align: {
    color: theme.palette.type === 'light' ? '#06C' : 'white',
    position: 'relative',
    top: '50%',
    transform: 'translateY(-40%)',
  },
  link_label: {
    color: theme.palette.type === 'light' ? '#181818' : 'white',
    maxWidth: '96px',
    fontSize: '12px',
    wordBreak: 'break-word',
    marginTop: '8px',
  },
}));

const QuickAccessAccordion = ({ data, expanded }: QuickAccessProps) => {
  const classes = useStyles();

  return (
    <Accordion defaultExpanded={expanded}>
      <AccordionSummary
        // expandIcon={<ExpandMoreIcon />}
        expandIcon={<ExpandMoreIcon />}
        IconButtonProps={{ size: 'small' }}
        aria-controls={`panel${data.name}-content`}
        id={`panel${data.name}-header`}
        className={classes.ml25}
      >
        {data?.name?.toLocaleUpperCase()}
      </AccordionSummary>
      <AccordionDetails>
        <section>
          {data.description && (
            <Typography
              className={`${classes.fontSize14} ${classes.ml25} ${classes.description}`}
            >
              {data?.description}
            </Typography>
          )}
          <div>
            <ul className={classes.link}>
              {(data.items || []).map((item, index) => (
                <li key={index} className={classes.t_align_c}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={classes.a_link}
                  >
                    <div className={classes.icon_style}>
                      <div className={classes.icon_align}>
                        {item.icon === 'ws' && <WorkspaceIcon />}
                        {item.icon === 'doc' && <DocumentIcon />}
                        {item.icon === 'gh' && <GitHubIcon />}
                      </div>
                    </div>
                    <Typography className={classes.link_label}>
                      {item?.label}
                    </Typography>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </AccordionDetails>
    </Accordion>
  );
};

export const QuickAccessCard = () => {
  return (
    <InfoCard title="Quick Access" noPadding>
      <Grid item>
        <QuickAccessAccordion data={links} expanded />
        <QuickAccessAccordion data={ansibleWorkspaces} />
        <QuickAccessAccordion data={discoverContent} />
        <QuickAccessAccordion data={developerTools} />
      </Grid>
    </InfoCard>
  );
};
