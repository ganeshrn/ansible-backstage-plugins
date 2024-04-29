import { Config } from '@backstage/config';

export type AnsibleDetails = {
  devSpacesBaseUrl: string;
  port?: number;
  baseUrl?: string;
};

function generateInitUrl(baseUrl: string, port: number): string {
  return `http://${baseUrl}:${port}/`;
}

function generateDevSpacesUrl(
  devSpacesBaseUrl: string,
  repoOwner: string,
  repoName: string,
): string {
  return `${devSpacesBaseUrl}#https://github.com/${repoOwner}/${repoName}`;
}

export function generateRepoUrl(repoOwner: string, repoName: string): string {
  return `github.com?owner=${repoOwner}&repo=${repoName}`;
}

export const getAnsibleConfig = (config: Config): AnsibleDetails => {
  return {
    devSpacesBaseUrl: config.getString('ansible.devSpacesBaseUrl'),
    baseUrl: config.getString('ansible.creatorService.baseUrl'),
    port: parseInt(config.getString('ansible.creatorService.port')),
  };
};

export const getAllAnsibleConfig = (config: Config): AnsibleDetails => {
  return getAnsibleConfig(config);
};

export const getDevSpacesUrlFromAnsibleConfig = (config: Config): string => {
  return config.getString('ansible.devSpacesBaseUrl');
};

export const getServiceUrlFromAnsibleConfig = (config: Config): string => {
  return generateInitUrl(
    config.getString('ansible.creatorService.baseUrl'),
    parseInt(config.getString('ansible.creatorService.port')),
  );
};

export const getDevspacesUrlFromAnsibleConfig = (
  config: Config,
  repoOwner: string,
  repoName: string,
): string => {
  return generateDevSpacesUrl(
    config.getString('ansible.devSpacesBaseUrl'),
    repoOwner,
    repoName,
  );
};
