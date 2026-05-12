export const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  };
}

export function handleOptions() {
  return {
    statusCode: 204,
    headers: corsHeaders,
    body: '',
  };
}
