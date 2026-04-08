// Access token lưu trong memory (biến JS thuần)
// Ưu điểm: XSS không thể đọc được (không có trong DOM, localStorage, hay cookie)
// Nhược điểm: mất khi reload → giải quyết bằng cách gọi /auth/refresh khi app khởi động
//             (refreshToken vẫn còn trong httpOnly cookie nên refresh được)

let _accessToken = '';

export const getAccessToken  = () => _accessToken;
export const setAccessToken  = (token: string) => { _accessToken = token; };
export const clearAccessToken = () => { _accessToken = ''; };
