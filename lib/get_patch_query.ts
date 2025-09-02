export const getPatchQuery = (
  key: string,
  data: Record<string, any>,
): { sql_val: string; sql_param: any[] } => {
  let sql_val = '';
  const sql_param: any[] = [];

  const keys = key.replace(/\s/g, '').split(',');

  for (const k of keys) {
    if (data[k] !== undefined && data[k].toString().trim() !== '') {
      sql_val += `${k} = ?, `;
      sql_param.push(data[k]);
    }
  }

  return { sql_val, sql_param };
};
