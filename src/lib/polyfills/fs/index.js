// Empty fs module for browser compatibility
export default {};
export * as promises from './promises.js';
export const readFile = () => {};
export const writeFile = () => {};
export const existsSync = () => false;
export const readFileSync = () => '';
export const writeFileSync = () => {};
export const fstatSync = () => ({ size: 0 });
export const lstatSync = () => ({ size: 0 });
export class ReadStream {
  constructor() {}
}