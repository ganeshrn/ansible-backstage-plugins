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
import { Tool } from "@backstage/plugin-home";

export interface IQuickAccessLinks {
    name?: string;
    description?: string;
    items?: Tool[];
}

export const links: IQuickAccessLinks = {
    name: 'Links',
    items: [
        {
        url: 'https://developers.redhat.com/products/ansible/overview?source=sso',
        label: 'Red Hat Developer',
        icon: 'ws', // Load <WorkspaceIcon /> component in .tsx file
        },
        {
        url: 'https://red.ht/aap-creator-guide',
        label: 'Ansible Creator Guide',
        icon: 'doc', // Load <DocumentIcon /> component in .tsx file
        },
        {
        url: 'https://access.redhat.com/documentation/en-us/red_hat_ansible_automation_platform',
        label: 'Ansible Automation Platform documentation',
        icon: 'doc',
        },
    ],
};

export const ansibleWorkspaces: IQuickAccessLinks = {
    name: 'Ansible development workspaces',
    description:
        'Create a workspace for multiple tools to easier develop ansible playbooks with roles.',
    items: [
        {
        url: 'https://developers.redhat.com',
        label: 'Red Hat Dev Spaces on OpenShift',
        icon: 'ws',
        },
        {
        url: 'https://access.redhat.com/products/red-hat-openshift-dev-spaces',
        label: 'Documentation',
        icon: 'doc',
        },
    ],
};

export const discoverContent: IQuickAccessLinks = {
    name: 'Discover Content',
    description:
        'Private Automation Hub is a self-hosted Ansible content management system. Organizations can host private hubs on their own infrastructure and manage it themselves.',
    items: [
        {
        url: 'https://developers.redhat.com',
        label: 'Private Automation Hub',
        icon: 'ws',
        },
        {
        url: 'https://red.ht/aap-pah-managing-content',
        label: 'Documentation',
        icon: 'doc',
        },
    ],
};

export const developerTools: IQuickAccessLinks = {
    name: 'Developer Tools',
    description:
        'Set of tools to help you build, test and deploy your automation content.',
    items: [
        {
        url: 'https://red.ht/aap-developer-tools',
        label: 'Ansible Developer Tools',
        icon: 'ws',
        },
        {
        url: 'https://developers.redhat.com/products/ansible/lightspeed',
        label: 'Ansible Lightspeed',
        icon: 'ws',
        },
        {
        url: 'https://red.ht/aap-code-bot-installation',
        label: 'Ansible code bot',
        icon: 'gh', // Load <GithubIcon /> component as icon in .tsx file
        },
    ],
};
