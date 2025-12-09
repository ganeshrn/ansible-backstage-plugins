export interface Config {
  catalog?: {
    providers?: {
      /**
       * AnsibleContentDiscoveryEntityProvider configuration
       */
      ansibleContentDiscovery?: {
        [name: string]: {
          /**
           * The GitHub organization to scan for Ansible collections
           * @visibility frontend
           */
          organization: string;

          /**
           * (Optional) The GitHub host. Defaults to github.com
           * @visibility frontend
           */
          host?: string;

          /**
           * (Optional) The path to the galaxy.yml file. Defaults to 'galaxy.yml'
           * @visibility frontend
           */
          galaxyPath?: string;

          /**
           * Schedule configuration for the entity provider
           * @visibility frontend
           */
          schedule?: {
            /**
             * Frequency of the sync in minutes, hours, or days
             * @visibility frontend
             */
            frequency: {
              minutes?: number;
              hours?: number;
              days?: number;
            };
            /**
             * Timeout for the sync in minutes, hours, or days
             * @visibility frontend
             */
            timeout?: {
              minutes?: number;
              hours?: number;
              days?: number;
            };
            /**
             * Initial delay before the first sync
             * @visibility frontend
             */
            initialDelay?: {
              seconds?: number;
              minutes?: number;
              hours?: number;
            };
          };

          /**
           * (Optional) Filters to apply when discovering repositories
           * @visibility frontend
           */
          filters?: {
            /**
             * Filter repositories by name pattern (regex supported)
             * @visibility frontend
             */
            repository?: string;

            /**
             * (Optional) Filter repositories by topics
             * If not specified, topic filtering is not applied
             * @visibility frontend
             */
            topic?: {
              /**
               * Include only repositories with these topics
               * @visibility frontend
               */
              include?: string[];
              /**
               * Exclude repositories with these topics
               * @visibility frontend
               */
              exclude?: string[];
            };

            /**
             * Allow archived repositories. Defaults to false
             * @visibility frontend
             */
            allowArchived?: boolean;

            /**
             * Allow forked repositories. Defaults to true
             * @visibility frontend
             */
            allowForks?: boolean;

            /**
             * Filter by repository visibility
             * @visibility frontend
             */
            visibility?: Array<'public' | 'private' | 'internal'>;
          };

          /**
           * (Optional) Validate that galaxy.yml exists before creating entity. Defaults to true
           * @visibility frontend
           */
          validateLocationsExist?: boolean;
        };
      };
    };
  };
}

