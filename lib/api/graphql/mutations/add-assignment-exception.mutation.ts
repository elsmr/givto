import { mapGroup } from '@givto/api/graphql-mappers';
import { Group, Mutation } from '@givto/api/graphql-schema';
import { AuthenticationError } from 'apollo-server-micro';

export const addAssignmentException: Mutation<{
  slug: string;
  exception: {
    subjectId: string;
    objectId: string;
  };
}> = async (
  _,
  { slug, exception: { subjectId, objectId } },
  { dataSources: { groups }, auth }
): Promise<Group | null> => {
  const claims = auth.get();

  if (!claims) {
    throw new AuthenticationError('Unauthorized');
  }

  const group = await groups.findBySlug(slug);

  if (!group) {
    return null;
  }

  const assignExceptions = { ...group.assignExceptions };

  if (assignExceptions[subjectId]) {
    assignExceptions[subjectId].push(objectId);
  } else {
    assignExceptions[subjectId] = [objectId];
  }

  if (assignExceptions[objectId]) {
    assignExceptions[objectId].push(subjectId);
  } else {
    assignExceptions[objectId] = [subjectId];
  }

  const updatedGroup = await groups.updateBySlug(slug, {
    assignExceptions
  });

  return updatedGroup ? mapGroup(updatedGroup, claims.sub) : null;
};
