export const ERP_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  PARSED: 'parsed',
  PARSE_ERROR: 'parse_error',
  UPLOAD_ERROR: 'upload_error',
  UPLOAD_SUCCESS: 'uploaded',
  SKIP_UPLOAD: 'skip_upload',
};

export const ERP_JST_API = {
  UPLOAD_ORDER: '/open/jushuitan/orders/upload',
  QUERY_ORDER: '/open/orders/single/query',
};

export const ERP_JST_CODE = {
  SUCCESS: 0,
  TOO_FREQUENT: 199,
  EXCEED_LIMIT: 200,
};
