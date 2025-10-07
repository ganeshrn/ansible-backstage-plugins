[![CI](https://github.com/ansible/ansible-backstage-plugins/actions/workflows/pr.yml/badge.svg?branch=main&event=schedule)](https://github.com/ansible/ansible-backstage-plugins/actions/workflows/pr.yml)

# Backstage plugins for Ansible

Welcome to the Ansible plugins for Backstage project! The goal of this project is to provide Ansible plugins for [backstage.io](https://backstage.io) to provide Ansible specific user experience in the developer port.

# Quick Start

To start the app, run:

```sh
./install-deps
```

Once the install step is done update `app-config.yaml` file with changes to `integrations.github.token` and other settings which are mentioned as `changeme`.

Then start the project with

```sh
yarn start
```

## Usage

To understand how to start using Ansible plugins in your Backstage environment please refer to the README file under each plugins root directory. Also refer documentation under [features](./docs/features) directory for more details.

## Security

For information about contributing and reporting security issues, see [SECURITY](SECURITY.md).

## License

This project is licensed under the Apache-2.0 License.
