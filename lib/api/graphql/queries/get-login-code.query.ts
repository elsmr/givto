import { mapLoginCode } from '../../graphql-mappers';
import { LoginCode, Query } from '../../graphql-schema';

export const getLoginCode: Query<{ code: string }> = async (
  _,
  { code },
  { dataSources: { loginCodes } }
): Promise<LoginCode | null> => {
  console.log('resolve login code', code);
  const mongoCode = await loginCodes.findByCode(code);
  if (!mongoCode) {
    return null;
  }
  return mapLoginCode(mongoCode);
};
