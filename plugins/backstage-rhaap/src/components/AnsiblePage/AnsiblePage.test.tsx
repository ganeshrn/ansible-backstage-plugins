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
import { AnsiblePage } from "./AnsiblePage";
import { errorTitle } from './SubscriptionCheckMsgs';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { ansibleApiRef, AnsibleApi } from '../../api';
import { mockAnsibleApi } from '../../tests/test_utils';

describe('ansible', () => {
    it('should render main page', async () => {
        const { getByTestId, getByRole } = await renderInTestApp(<TestApiProvider
            apis={[
              [ansibleApiRef, mockAnsibleApi]
            ]}
          >
            <AnsiblePage />
          </TestApiProvider>);
        expect(AnsiblePage).toBeDefined();

        // expect header, tabs to be defined and present
        expect(getByTestId('ansible-header')).toBeInTheDocument();
        expect(getByRole('tablist')).toBeInTheDocument();
        const overviewButton = screen.getByRole('tab', {name: /Overview/i});
        expect(overviewButton).not.toBeNull();
        expect(overviewButton).toBeInTheDocument();
    });
});

describe('AAP subscription check', () => {
    it('subscription check passes', async () => {
        const mockApiSpecific: jest.Mocked<AnsibleApi> = {
            isValidSubscription: jest.fn().mockReturnValue({
                status: 200,
                isValid: true,
                isCompliant: true
            })
        };
        const { queryByTestId } = await renderInTestApp(<TestApiProvider
            apis={[
              [ansibleApiRef, mockApiSpecific]
            ]}
          >
            <AnsiblePage />
          </TestApiProvider>);

        expect(AnsiblePage).toBeDefined();

        // alert should be missing
        expect(queryByTestId('subscription-alert')).not.toBeInTheDocument();
    });

    it('subscription check response is 500', async () => {
        const mockApiSpecific: jest.Mocked<AnsibleApi> = {
            isValidSubscription: jest.fn().mockReturnValue({
                status: 500,
                isValid: false,
                isCompliant: false
            })
        };
        const { getByTestId } = await renderInTestApp(<TestApiProvider
            apis={[
              [ansibleApiRef, mockApiSpecific]
            ]}
          >
            <AnsiblePage />
          </TestApiProvider>);

        expect(AnsiblePage).toBeDefined();

        const alert = getByTestId('subscription-alert');
        // is alert in document
        expect(alert).toBeInTheDocument();
        // is alert title correct
        expect(alert.textContent).toContain(errorTitle.SSL_OR_UNREACHABLE);
        // is alert message correct
        expect(alert.textContent).toContain(
            'Verify that Ansible Automation Platform is reachable and correctly configured in the Ansible plug-ins. To get help, please refer to the Ansible plug-ins installation guide'
        );
    });

    it('subscription check response is 404', async () => {
        const mockApiSpecific: jest.Mocked<AnsibleApi> = {
            isValidSubscription: jest.fn().mockReturnValue({
                status: 404,
                isValid: false,
                isCompliant: false
            })
        };
        const { getByTestId } = await renderInTestApp(<TestApiProvider
            apis={[
              [ansibleApiRef, mockApiSpecific]
            ]}
          >
            <AnsiblePage />
          </TestApiProvider>);

        expect(AnsiblePage).toBeDefined();

        const alert = getByTestId('subscription-alert');
        // is alert in document
        expect(alert).toBeInTheDocument();
        // is alert title correct
        expect(alert.textContent).toContain(errorTitle.RESOURCE_FAIL);
        // is alert message correct
        expect(alert.textContent).toContain(
            'Verify that the resource url for Ansible Automation Platform are correctly configured in the Ansible plug-ins. For help, please refer to the Ansible plug-ins installation guide'
        );
    });

    it('subscription check response is 401', async () => {
        const mockApiSpecific: jest.Mocked<AnsibleApi> = {
            isValidSubscription: jest.fn().mockReturnValue({
                status: 401,
                isValid: false,
                isCompliant: false
            })
        };
        const { getByTestId } = await renderInTestApp(<TestApiProvider
            apis={[
              [ansibleApiRef, mockApiSpecific]
            ]}
          >
            <AnsiblePage />
          </TestApiProvider>);

        expect(AnsiblePage).toBeDefined();

        const alert = getByTestId('subscription-alert');
        // is alert in document
        expect(alert).toBeInTheDocument();
        // is alert title correct
        expect(alert.textContent).toContain(errorTitle.AUTH_FAIL);
        // is alert message correct
        expect(alert.textContent).toContain(
            'Verify that the authentication details for Ansible Automation Platform are correctly configured in the Ansible plug-ins. For help, please refer to the Ansible plug-ins installation guide'
        );
    });

    it('subscription check response is incompliant', async () => {
        const mockApiSpecific: jest.Mocked<AnsibleApi> = {
            isValidSubscription: jest.fn().mockReturnValue({
                status: 200,
                isValid: true,
                isCompliant: false
            })
        };
        const { getByTestId } = await renderInTestApp(<TestApiProvider
            apis={[
              [ansibleApiRef, mockApiSpecific]
            ]}
          >
            <AnsiblePage />
          </TestApiProvider>);

        expect(AnsiblePage).toBeDefined();

        const alert = getByTestId('subscription-alert');
        // is alert in document
        expect(alert).toBeInTheDocument();
        // is alert title correct
        expect(alert.textContent).toContain(errorTitle.NON_COMPLIANT);
        // is alert message correct
        expect(alert.textContent).toContain(
            'The connected Ansible Automation Platform subscription is out of compliance. Contact your Red Hat account team to obtain a new subscription entitlement. Learn more about account compliance'
        );
    });

    it('subscription check response is invalid', async () => {
        const mockApiSpecific: jest.Mocked<AnsibleApi> = {
            isValidSubscription: jest.fn().mockReturnValue({
                status: 200,
                isValid: false,
                isCompliant: true
            })
        };
        const { getByTestId } = await renderInTestApp(<TestApiProvider
            apis={[
              [ansibleApiRef, mockApiSpecific]
            ]}
          >
            <AnsiblePage />
          </TestApiProvider>);

        expect(AnsiblePage).toBeDefined();

        const alert = getByTestId('subscription-alert');
        // is alert in document
        expect(alert).toBeInTheDocument();
        // is alert title correct
        expect(alert.textContent).toContain(errorTitle.INVALID_LICENSE);
        // is alert message correct
        expect(alert.textContent).toContain(
            'The connected Ansible Automation Platform subscription is invalid. Contact your Red Hat account team, or start an Ansible Automation Platform trial'
        );
    });
});
