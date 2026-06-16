import type { OpenAPIPath } from '../../../type';
import { LoginPath } from './login';
import { RegisterPath } from './register';
import { PasswordPath } from './password';
import { AccountCancellationPath } from './cancellation';

export const UserAccountPath: OpenAPIPath = {
  ...LoginPath,
  ...RegisterPath,
  ...PasswordPath,
  ...AccountCancellationPath
};
