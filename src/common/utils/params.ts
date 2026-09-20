export function param(value: string | string[] | undefined, name = 'id'): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  throw new Error(`Missing route parameter: ${name}`);
}
