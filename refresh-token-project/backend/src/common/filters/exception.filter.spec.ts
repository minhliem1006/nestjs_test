import { HttpExceptionFilter } from './exception.filter';
import {
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

// Helper tạo mock ArgumentsHost — giả lập req/res của Express
function createMockHost(url: string) {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: mockStatus }),
      getRequest:  () => ({ url }),
    }),
  } as any;

  return { host, mockStatus, mockJson };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('401 - UnauthorizedException: trả đúng statusCode và message', () => {
    const { host, mockStatus, mockJson } = createMockHost('/auth/login');

    const exception = new UnauthorizedException('Sai mật khẩu');
    console.log('Đầu vào - exception:', exception.getStatus(), exception.message);

    filter.catch(exception, host);

    console.log('Đầu ra - response:', mockJson.mock.calls[0][0]);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      statusCode: 401,
      message: 'Sai mật khẩu',
      path: '/auth/login',
    }));
  });

  it('409 - ConflictException: trả đúng statusCode và message', () => {
    const { host, mockStatus, mockJson } = createMockHost('/auth/register');

    filter.catch(new ConflictException('Username đã tồn tại'), host);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      statusCode: 409,
      message: 'Username đã tồn tại',
      path: '/auth/register',
    }));
  });

  it('403 - ForbiddenException: trả đúng statusCode và message', () => {
    const { host, mockStatus, mockJson } = createMockHost('/auth/me');

    filter.catch(new ForbiddenException('Chỉ admin mới có quyền truy cập'), host);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      statusCode: 403,
      message: 'Chỉ admin mới có quyền truy cập',
      path: '/auth/me',
    }));
  });

  it('400 - BadRequestException với array message (ValidationPipe): trả đúng array', () => {
    const { host, mockStatus, mockJson } = createMockHost('/auth/register');
    const errors = ['Username tối thiểu 3 ký tự', 'Password tối thiểu 6 ký tự'];

    filter.catch(new BadRequestException(errors), host);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      statusCode: 400,
      message: errors,
      path: '/auth/register',
    }));
  });

  it('response luôn có field timestamp dạng ISO string', () => {
    const { host, mockJson } = createMockHost('/auth/login');

    filter.catch(new UnauthorizedException('lỗi'), host);

    const result = mockJson.mock.calls[0][0];
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('response luôn có success = false', () => {
    const { host, mockJson } = createMockHost('/auth/login');

    filter.catch(new UnauthorizedException('lỗi'), host);

    expect(mockJson.mock.calls[0][0].success).toBe(false);
  });
});
