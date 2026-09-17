import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// 用法：@CurrentUser() user: { id: string; email: string }
// 配合 JwtAuthGuard 使用，从 req.user 取当前登录用户（多租户隔离依据）。
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
