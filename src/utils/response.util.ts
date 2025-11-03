type ResponseType = {
  code: number;
  data?: any;
  message?: string;
  count?: number;
  summary?: any;
};

export const createResponse = (
  code: number,
  data?: any,
  message?: string,
  count?: number,
  summary?: any,
): ResponseType => ({ code, data, message, count, summary });

export const responseWithCount = (data, count, msg?: string) =>
  createResponse(200, data, msg || 'success', count);

export const responseSuccess = (data, msg?: string) =>
  createResponse(200, data, msg || 'success');

export const responseError = (msg) => createResponse(500, '', msg);

export const wrapperResponse = (p, msg) =>
  p
    .then((data) => responseSuccess(data, msg))
    .catch((err) => responseError(err.message));
