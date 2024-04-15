export interface Config {
  catalog?: {
    providers?: {
      ansible?: {
        /**
         * Url of the hub cluster developer hub instance
         */
        devSpacesBaseUrl: string;
        /**
         * base url for the creator-service
         * @visibility secret
         */
        baseUrl: string;
        /**
         * port at which the creator-service is exposed
         */
        port?: number;
      };
    };
  };
}
