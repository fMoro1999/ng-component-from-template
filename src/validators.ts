export const requiredValidator = (value: string) => {
  const isValid = Boolean(value);

  if (isValid) {
    return '';
  } else {
    return 'Path is required.';
  }
};
