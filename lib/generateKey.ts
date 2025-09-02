const ranStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const createKey = (count: number = 16, useTimestamp: boolean = false): string => {
  let key = '';

  for (let i = 0; i < count; i++) {
    const randIndex = Math.floor(Math.random() * ranStr.length);
    key += ranStr[randIndex];
  }

  if (useTimestamp) {
    key += '_' + Date.now();
  }

  return key;
};
