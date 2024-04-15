import { Config } from "@backstage/config";

const ANSIBLE_PREFIX = "catalog.providers.ansible";

export type AnsibleDetails = {
  devSpacesBaseUrl: string;
  port?: number;
  baseUrl?: string;
};

export const getFromAnsibleConfig = (config: Config): Config => {
  // Check if required values are valid
  const requiredValues = ["baseUrl"];
  requiredValues.forEach((key) => {
    if (!config.has(key)) {
      throw new Error(
        `Value must be specified in config at '${ANSIBLE_PREFIX}.${key}'`
      );
    }
  });
  return config;
};

export const getHubClusterFromConfig = (config: Config): AnsibleDetails => {
  const hub = getFromAnsibleConfig(config);

  return {
    devSpacesBaseUrl: hub.getString("devSpacesBaseUrl"),
    baseUrl: hub.getString("baseUrl"),
    port: hub.getOptionalNumber("port"),
  };
};

export const readAnsibleConfigs = (config: Config): AnsibleDetails => {
  const ansibleConfigs = config.getConfig(ANSIBLE_PREFIX);
  return getHubClusterFromConfig(ansibleConfigs);
};
