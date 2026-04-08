import { SetMetadata } from '@nestjs/common';

export const RequireUsername = (username: string) => SetMetadata('requiredUsername', username);
