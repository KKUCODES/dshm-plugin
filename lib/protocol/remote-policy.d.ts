export declare function remotePermission(endpoint: string, stream: boolean): 'basic' | 'management' | undefined;
export declare function remoteEndpoints(management: boolean, dynamicCordis?: boolean, sessionContract?: 'legacy' | 'target', scheduleCatalog?: boolean): {
    calls: string[];
    streams: string[];
};
/** 不重写 DSH 参数验证；这里只收紧手机端额外的产品边界。 */
export declare function remoteRequestAllowed(endpoint: string, payload: Record<string, unknown>, fileContract?: 'legacy' | 'target' | 'either'): boolean;
