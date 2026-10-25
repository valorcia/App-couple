import { v7 as uuidv7, validate } from 'uuid';

export const newId = (): string => uuidv7();
export const isUuid = (value: string): boolean => validate(value);
