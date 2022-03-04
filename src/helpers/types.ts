export type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

export type UnwrapOcktokitResponse<T> = T extends () => Promise<{data: infer U}> ? U : never;

export type NonNullable<T> = Exclude<T, null | undefined>;
