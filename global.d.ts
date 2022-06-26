declare module '*?raw' {
  const _: string;
  export default _;
}

type MaybePromise<T> = Promise<T> | T;
