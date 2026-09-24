export const migration007 = `
ALTER TABLE users
ADD COLUMN avatar_uri TEXT;
`;
