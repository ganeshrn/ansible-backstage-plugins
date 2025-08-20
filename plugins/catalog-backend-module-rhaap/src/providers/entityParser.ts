import { formatNameSpace } from '../helpers';

import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
} from '@backstage/catalog-model';
import {
  IJobTemplate,
  Organization,
  ISurvey,
  Team,
  User,
} from '@ansible/backstage-rhaap-common';
import { generateTemplate } from './dynamicJobTemplate';

export function organizationParser(options: {
  baseUrl: string;
  nameSpace: string;
  org: Organization;
  orgMembers: string[];
  teams: string[];
}): Entity {
  const { baseUrl, org, nameSpace, orgMembers, teams } = options;
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Group',
    metadata: {
      namespace: nameSpace,
      name: formatNameSpace(org.name),
      title: org.name,
      annotations: {
        [ANNOTATION_LOCATION]: `url:${baseUrl}/access/organizations/${org.id}/details`,
        [ANNOTATION_ORIGIN_LOCATION]: `url:${baseUrl}/access/organizations/${org.id}/details`,
      },
    },
    spec: {
      type: 'organization',
      children: teams,
      members: orgMembers,
    },
  };
}

export function teamParser(options: {
  baseUrl: string;
  nameSpace: string;
  team: Team;
  teamMembers: string[];
}): Entity {
  const { baseUrl, team, nameSpace, teamMembers } = options;
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Group',
    metadata: {
      namespace: nameSpace,
      name: team.groupName,
      title: team.name,
      description: team.description,
      annotations: {
        [ANNOTATION_LOCATION]: `url:${baseUrl}/access/teams/${team.id}/details`,
        [ANNOTATION_ORIGIN_LOCATION]: `url:${baseUrl}/access/teams/${team.id}/details`,
      },
    },
    spec: {
      type: 'team',
      children: [],
      members: teamMembers,
    },
  };
}

export function userParser(options: {
  baseUrl: string;
  nameSpace: string;
  user: User;
  groupMemberships: string[];
  maxGroupMemberships?: number;
}): Entity {
  const {
    baseUrl,
    user,
    nameSpace,
    groupMemberships,
    maxGroupMemberships = 50,
  } = options;

  // Add aap-admins group for superusers (this should always be included)
  const finalGroupMemberships = [...groupMemberships];
  if (user.is_superuser === true) {
    finalGroupMemberships.push('aap-admins');
  }

  // Limit group memberships to prevent JWT token size issues
  // Keep aap-admins and most important groups, truncate the rest
  let limitedGroupMemberships = finalGroupMemberships;
  if (finalGroupMemberships.length > maxGroupMemberships) {
    // Always keep aap-admins if present
    const aapAdminsIndex = finalGroupMemberships.indexOf('aap-admins');
    const importantGroups = aapAdminsIndex >= 0 ? ['aap-admins'] : [];

    // Add other groups up to the limit
    const otherGroups = finalGroupMemberships.filter(
      group => group !== 'aap-admins',
    );
    const remainingSlots = maxGroupMemberships - importantGroups.length;

    limitedGroupMemberships = [
      ...importantGroups,
      ...otherGroups.slice(0, remainingSlots),
    ];

    console.warn(
      `User ${user.username} has ${finalGroupMemberships.length} group memberships, ` +
        `limiting to ${maxGroupMemberships} to prevent JWT token size issues. ` +
        `Excluded groups: ${otherGroups.slice(remainingSlots).join(', ')}`,
    );
  }
  const name =
    user.first_name?.length || user.last_name?.length
      ? `${user.first_name} ${user.last_name}`
      : user.username;

  const annotations: Record<string, string> = {
    [ANNOTATION_LOCATION]: `url:${baseUrl}/access/users/${user.id}/details`,
    [ANNOTATION_ORIGIN_LOCATION]: `url:${baseUrl}/access/users/${user.id}/details`,
  };

  // Add RBAC-relevant annotations
  if (user.is_superuser !== undefined) {
    annotations['aap.platform/is_superuser'] = String(user.is_superuser);
  }

  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      namespace: nameSpace,
      name: user.username,
      title: name,
      annotations,
    },
    spec: {
      profile: {
        username: user.username,
        displayName: name,
        email: user?.email ? user.email : ' ',
      },
      memberOf: limitedGroupMemberships,
    },
  };
}

export const aapJobTemplateParser = (options: {
  baseUrl: string;
  nameSpace: string;
  job: IJobTemplate;
  survey: ISurvey | null;
}): Entity => {
  return generateTemplate(options);
};
